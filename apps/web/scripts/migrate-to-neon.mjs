/**
 * Copy TechHub rows from Supabase to Neon without changing the live app.
 *
 * Run from apps/web:
 *   node scripts/migrate-to-neon.mjs          # counts only
 *   node scripts/migrate-to-neon.mjs --apply  # idempotent copy and parity check
 *
 * Credentials remain in ignored .env files in the TechHub workspace.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@neondatabase/serverless";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, "..");
const rootDir = path.resolve(webDir, "../..");
const apply = process.argv.includes("--apply");

function readEnv(file) {
  return Object.fromEntries(
    fs.readFileSync(file, "utf8").split(/\r?\n/)
      .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
      .map((line) => {
        const index = line.indexOf("=");
        let value = line.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return [line.slice(0, index), value];
      }),
  );
}

const sourceEnv = readEnv(path.join(webDir, ".env.local"));
const targetEnv = readEnv(path.join(rootDir, ".env.neon.vercel.local"));
if (!sourceEnv.NEXT_PUBLIC_SUPABASE_URL || !sourceEnv.SUPABASE_SERVICE_ROLE_KEY ||
    !targetEnv.DATABASE_URL_UNPOOLED) {
  throw new Error("Supabase or Neon connection configuration is missing");
}

const supabase = createClient(
  sourceEnv.NEXT_PUBLIC_SUPABASE_URL,
  sourceEnv.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Only these fixed table and column names are interpolated into SQL.
const tables = [
  { name: "legacy_users", key: ["id"], columns: ["id", "email", "created_at"] },
  { name: "categories", key: ["id"], columns: ["id", "name", "slug", "created_at"] },
  { name: "tags", key: ["id"], columns: ["id", "name", "created_at"] },
  { name: "sources", key: ["id"], columns: ["id", "name", "feed_url", "feed_type", "default_language", "default_category_id", "is_active", "last_ingested_at", "created_at", "section"] },
  { name: "content_items", key: ["id"], columns: ["id", "url", "type", "title", "description", "thumbnail", "source", "language", "slug", "status", "published_at", "created_at", "updated_at", "view_count", "likes_count", "section", "deadline", "contest_type"] },
  { name: "ingestion_runs", key: ["id"], columns: ["id", "source_id", "started_at", "finished_at", "status", "processed_count", "created_count", "skipped_count", "failed_count", "error_message", "created_at"] },
  { name: "profiles", key: ["user_id"], columns: ["user_id", "email", "nickname", "role", "created_at"] },
  { name: "content_categories", key: ["content_id", "category_id"], columns: ["content_id", "category_id"] },
  { name: "content_tags", key: ["content_id", "tag_id"], columns: ["content_id", "tag_id"] },
  { name: "bookmarks", key: ["user_id", "content_id"], columns: ["user_id", "content_id", "created_at"] },
  { name: "likes", key: ["user_id", "content_id"], columns: ["user_id", "content_id", "created_at"] },
];

async function fetchAll(table) {
  if (table.name === "legacy_users") {
    const users = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error(`Supabase auth users: ${error.message}`);
      users.push(...data.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      })));
      if (data.users.length < 100) break;
    }
    if (users.some((user) => !user.email)) {
      throw new Error("An auth user has no email; migration needs a manual mapping");
    }
    return users;
  }

  const rows = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from(table.name)
      .select(table.columns.join(","))
      .range(offset, offset + batchSize - 1);
    if (error) throw new Error(`Supabase ${table.name}: ${error.message}`);
    rows.push(...data);
    if (data.length < batchSize) break;
  }
  return rows;
}

function upsertQuery(table) {
  const names = table.columns.map((column) => `"${column}"`).join(", ");
  const conflict = table.key.map((column) => `"${column}"`).join(", ");
  const updates = table.columns
    .filter((column) => !table.key.includes(column))
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(", ");
  return `INSERT INTO public."${table.name}" (${names})
    SELECT ${names} FROM jsonb_populate_recordset(null::public."${table.name}", $1::jsonb)
    ON CONFLICT (${conflict}) ${updates ? `DO UPDATE SET ${updates}` : "DO NOTHING"}`;
}

const source = new Map();
for (const table of tables) {
  const rows = await fetchAll(table);
  source.set(table.name, rows);
  console.log(`${table.name}: ${rows.length}`);
}

if (!apply) {
  console.log("Dry run complete. Pass --apply to copy rows to Neon.");
  process.exit(0);
}

const db = new Client(targetEnv.DATABASE_URL_UNPOOLED);
await db.connect();
try {
  const schema = fs.readFileSync(path.join(rootDir, "neon/migrations/0001_initial.sql"), "utf8");
  await db.query("BEGIN");
  try {
    await db.query(schema);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }

  await db.query("BEGIN");
  try {
    for (const table of tables) {
      const rows = source.get(table.name);
      const query = upsertQuery(table);
      for (let offset = 0; offset < rows.length; offset += 200) {
        await db.query(query, [JSON.stringify(rows.slice(offset, offset + 200))]);
      }
      if (table.key.length === 1 && table.key[0] === "id" && table.name !== "legacy_users") {
        await db.query(`SELECT setval(pg_get_serial_sequence('public.${table.name}', 'id'),
          GREATEST(COALESCE((SELECT MAX(id) FROM public."${table.name}"), 1), 1),
          EXISTS (SELECT 1 FROM public."${table.name}"))`);
      }
    }
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }

  for (const table of tables) {
    const { rows } = await db.query(`SELECT count(*)::integer AS count FROM public."${table.name}"`);
    const expected = source.get(table.name).length;
    if (rows[0].count < expected) {
      throw new Error(`Parity check failed for ${table.name}: ${rows[0].count} < ${expected}`);
    }
    console.log(`Verified ${table.name}: ${expected} source rows, ${rows[0].count} target rows`);
  }
  const { rows: orphanRows } = await db.query(`
    SELECT
      (SELECT count(*) FROM bookmarks b LEFT JOIN legacy_users u ON u.id=b.user_id WHERE u.id IS NULL) AS bookmarks,
      (SELECT count(*) FROM likes l LEFT JOIN legacy_users u ON u.id=l.user_id WHERE u.id IS NULL) AS likes,
      (SELECT count(*) FROM profiles p LEFT JOIN legacy_users u ON u.id=p.user_id WHERE u.id IS NULL) AS profiles
  `);
  if (Object.values(orphanRows[0]).some((value) => Number(value) !== 0)) {
    throw new Error("A user-linked row has no matching migrated account");
  }
  console.log("All user-linked rows have matching account IDs.");
} finally {
  await db.end();
}
