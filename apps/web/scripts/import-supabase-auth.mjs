/**
 * Imports the three Supabase email/password accounts after 0002_better_auth.sql.
 * The source JSON is an ignored, owner-readable export from auth.users.
 * Run with DATABASE_URL set; dry run by default, --apply to write.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

const sourcePath = resolve(process.cwd(), "../../.supabase-auth-export.json");
const users = JSON.parse(readFileSync(sourcePath, "utf8"));
if (!Array.isArray(users) || users.some((u) =>
  !u.id || !u.email || !/^\$2[aby]\$\d\d\$/.test(u.encrypted_password ?? "")
)) {
  throw new Error("Invalid Supabase auth export");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  const { rows: legacy } = await client.query(
    "select id::text, email from legacy_users order by id",
  );
  if (legacy.length !== users.length || users.some((u) =>
    !legacy.some((l) => l.id === u.id && l.email === u.email)
  )) {
    throw new Error("Existing TechHub identities do not match auth export");
  }

  if (!process.argv.includes("--apply")) {
    console.log(`Dry run: ${users.length} matching users and bcrypt hashes`);
  } else {
    await client.query("begin");
    for (const u of users) {
      const { rows: profiles } = await client.query(
        "select nickname from profiles where user_id = $1",
        [u.id],
      );
      const name = profiles[0]?.nickname || u.email.split("@")[0];
      await client.query(
        `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         values ($1, $2, $3, $4, $5, now())
         on conflict (id) do update set
           email = excluded.email, "emailVerified" = excluded."emailVerified"`,
        [u.id, name, u.email, Boolean(u.email_confirmed_at), u.created_at],
      );
      const { rows: accounts } = await client.query(
        `select id from "account" where "userId" = $1 and "providerId" = 'credential'`,
        [u.id],
      );
      if (accounts.length === 0) {
        await client.query(
          `insert into "account"
           (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
           values ($1, $2, 'credential', $3, $4, $5, now())`,
          [randomUUID(), u.id, u.id, u.encrypted_password, u.created_at],
        );
      } else if (accounts.length !== 1) {
        throw new Error("Duplicate credential accounts found");
      }
    }
    const { rows: check } = await client.query(
      `select count(*)::int as users,
        count(a.password)::int as passwords
       from "user" u left join "account" a
       on a."userId" = u.id and a."providerId" = 'credential'
       where u.id = any($1::uuid[])`,
      [users.map((u) => u.id)],
    );
    if (check[0].users !== users.length || check[0].passwords !== users.length) {
      throw new Error("Imported auth row count mismatch");
    }
    await client.query("commit");
    console.log(`Imported ${users.length} users and credential hashes`);
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
