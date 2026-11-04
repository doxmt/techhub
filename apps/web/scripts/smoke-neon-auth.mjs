import { randomUUID, randomBytes } from "node:crypto";
import { Pool } from "pg";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const email = `techhub-smoke-${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString("base64url");
let userId;
const call = (path, body, cookie) => fetch(`${base}/api/auth/${path}`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: base,
    ...(cookie ? { cookie } : {}),
  },
  body: JSON.stringify(body),
});

try {
  const signup = await call("sign-up/email", { name: "테스트", email, password });
  if (!signup.ok) throw new Error(`signup failed: ${signup.status} ${await signup.text()}`);
  userId = (await signup.json()).user?.id;
  if (!userId) throw new Error("signup did not return user ID");
  const { rows: linked } = await pool.query(
    "select (select count(*)::int from legacy_users where id = $1::uuid) as legacy, (select count(*)::int from profiles where user_id = $1::uuid) as profile",
    [userId],
  );
  if (linked[0].legacy !== 1 || linked[0].profile !== 1) throw new Error("user/profile trigger failed");

  const wrong = await call("sign-in/email", { email, password: "incorrect-password" });
  if (wrong.ok) throw new Error("wrong password was accepted");

  const login = await call("sign-in/email", { email, password });
  if (!login.ok) throw new Error(`login failed: ${login.status} ${await login.text()}`);
  const cookie = login.headers.getSetCookie().map((v) => v.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login did not set a session cookie");
  const profile = await fetch(`${base}/profile`, { headers: { cookie } });
  if (!profile.ok || !(await profile.text()).includes("테스트")) {
    throw new Error(`authenticated profile failed: ${profile.status}`);
  }

  const { rows: content } = await pool.query(
    "select id, title, likes_count from content_items where status = 'published' order by id limit 1",
  );
  if (!content[0]) throw new Error("no published content");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role techhub_app");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    await client.query("insert into bookmarks (user_id, content_id) values ($1::uuid, $2)", [userId, content[0].id]);
    await client.query("insert into likes (user_id, content_id) values ($1::uuid, $2)", [userId, content[0].id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { client.release(); }
  const { rows: liked } = await pool.query("select likes_count from content_items where id = $1", [content[0].id]);
  if (liked[0].likes_count !== content[0].likes_count + 1) throw new Error("likes count trigger failed");
  const saved = await fetch(`${base}/?section=saved`, { headers: { cookie } });
  if (!saved.ok || !(await saved.text()).includes(content[0].title)) {
    throw new Error(`saved feed failed: ${saved.status}`);
  }

  console.log("PASS signup, wrong-password rejection, login, profile, saved feed, RLS writes, likes count");
} finally {
  if (userId) {
    await pool.query('delete from "user" where id = $1::uuid', [userId]);
    const { rows } = await pool.query(
      "select count(*)::int as n from legacy_users where id = $1::uuid", [userId],
    );
    // eslint-disable-next-line no-unsafe-finally
    if (rows[0].n !== 0) throw new Error("user deletion did not cascade");
  }
  await pool.end();
}
