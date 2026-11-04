import { randomUUID, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

const origin = process.env.SMOKE_PREVIEW_URL;
if (!origin || !process.env.DATABASE_URL) throw new Error("SMOKE_PREVIEW_URL and DATABASE_URL required");
const globalConfig = new URL("../../../.vercel-cli-auth", import.meta.url).pathname;
const projectRoot = new URL("../../../", import.meta.url).pathname;
const email = `techhub-preview-${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString("base64url");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
let userId;

function request(path, body, cookie = "") {
  const args = ["--global-config", globalConfig, "curl", path,
    "--deployment", origin, "--", "-sS", "-i", "-H", `Origin: ${origin}`];
  if (body !== undefined) args.push("-X", "POST", "-H", "Content-Type: application/json", "--data", JSON.stringify(body));
  if (cookie) args.push("-H", `Cookie: ${cookie}`);
  const result = spawnSync("vercel", args, { cwd: projectRoot, encoding: "utf8", maxBuffer: 5_000_000 });
  if (result.status !== 0) throw new Error(`vercel curl failed: ${result.stderr.slice(-400)}`);
  const split = result.stdout.indexOf("\r\n\r\n");
  const headers = result.stdout.slice(0, split);
  const text = result.stdout.slice(split + 4);
  const status = Number(headers.match(/^HTTP\/\S+ (\d+)/)?.[1]);
  const cookies = [...headers.matchAll(/^set-cookie: ([^;\r\n]+)/gim)].map((m) => m[1]).join("; ");
  return { status, text, cookies };
}

try {
  const signup = request("/api/auth/sign-up/email", { email, password, name: "미리보기 테스트" });
  if (signup.status !== 200) throw new Error(`preview signup status ${signup.status}: ${signup.text.slice(0, 200)}`);
  userId = JSON.parse(signup.text).user?.id;
  if (!userId) throw new Error("preview signup returned no user ID");
  const wrong = request("/api/auth/sign-in/email", { email, password: "incorrect-password" });
  if (wrong.status === 200) throw new Error("preview accepted wrong password");
  const login = request("/api/auth/sign-in/email", { email, password });
  if (login.status !== 200 || !login.cookies) throw new Error(`preview login failed: ${login.status}`);
  const profile = request("/profile", undefined, login.cookies);
  if (profile.status !== 200 || !profile.text.includes("미리보기 테스트")) {
    throw new Error(`preview authenticated profile failed: ${profile.status}`);
  }
  const { rows: content } = await pool.query(
    "select id, title from content_items where status = 'published' order by id limit 1",
  );
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role techhub_app");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    await client.query("insert into bookmarks (user_id, content_id) values ($1::uuid, $2)", [userId, content[0].id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally { client.release(); }
  const saved = request("/?section=saved", undefined, login.cookies);
  if (saved.status !== 200 || !saved.text.includes(content[0].title)) {
    throw new Error(`preview saved feed failed: ${saved.status}`);
  }
  console.log("PASS preview signup, wrong-password rejection, login, profile, saved feed");
} finally {
  if (userId) await pool.query('delete from "user" where id = $1::uuid', [userId]);
  await pool.end();
}
