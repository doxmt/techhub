import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  const { rows: users } = await client.query("select id::text from legacy_users order by id limit 2");
  if (users.length !== 2) throw new Error("Need two users to check isolation");
  await client.query("begin");
  await client.query("set local role techhub_app");
  const anonymous = await client.query("select count(*)::int as n from profiles");
  if (anonymous.rows[0].n !== 0) throw new Error("Anonymous profile access was allowed");
  await client.query("select set_config('app.user_id', $1, true)", [users[0].id]);
  const own = await client.query("select count(*)::int as n from profiles where user_id = $1::uuid", [users[0].id]);
  const other = await client.query("select count(*)::int as n from profiles where user_id = $1::uuid", [users[1].id]);
  if (own.rows[0].n !== 1 || other.rows[0].n !== 0) throw new Error("Profile RLS isolation failed");
  const otherBookmarks = await client.query("select count(*)::int as n from bookmarks where user_id = $1::uuid", [users[1].id]);
  if (otherBookmarks.rows[0].n !== 0) throw new Error("Bookmark RLS isolation failed");
  const publicContent = await client.query("select count(*)::int as n from content_items where status = 'published'");
  if (publicContent.rows[0].n === 0) throw new Error("Public content became inaccessible");
  await client.query("rollback");
  console.log("PASS anonymous, own-user, other-user RLS and public feed access");
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
