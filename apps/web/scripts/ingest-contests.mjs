/**
 * 공모전 수집을 로컬에서 실행한다.
 *
 * 위비티가 Vercel 데이터센터 IP를 HTTP 403으로 차단하기 때문에(issue #49)
 * 프로덕션 크론에서는 공모전 수집이 실패한다. 위비티가 허용하는 네트워크(로컬)에서
 * 같은 수집 로직을 그대로 실행해 Supabase에 적재한다.
 *
 * 사용법:
 *   # 정기 최신화 (목록 3페이지)
 *   node --experimental-strip-types apps/web/scripts/ingest-contests.mjs
 *
 *   # 과거 등록분 백필 (목록 12페이지, 소스당 최대 200건)
 *   WEVITY_MAX_LIST_PAGES=12 INGEST_CONTEST_MAX_ITEMS=200 \
 *     node --experimental-strip-types apps/web/scripts/ingest-contests.mjs
 *
 * 필요한 환경변수는 저장소 루트 .env.local에서 읽는다.
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    throw new Error(`.env.local을 찾을 수 없다: ${file}`);
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
  (key) => !process.env[key],
);
if (missing.length > 0) {
  console.error(`환경변수 누락: ${missing.join(", ")}`);
  console.error("Supabase 대시보드 > Project Settings > API 에서 값을 확인해 .env.local에 채운다.");
  process.exit(1);
}

// service.ts는 process.env를 읽으므로 로드 후에 import 한다
const { runIngestion } = await import(
  path.join(ROOT, "apps/web/features/ingestion/server/service.ts")
);

const pages = process.env.WEVITY_MAX_LIST_PAGES ?? "3(기본)";
const cap = process.env.INGEST_CONTEST_MAX_ITEMS ?? "60(기본)";
console.log(`공모전 수집 시작 — 목록 ${pages}페이지, 소스당 최대 ${cap}건`);

const started = Date.now();
const result = await runIngestion({ section: "contest" });
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

console.log(`\n완료 (${elapsed}s)`);
console.log(`  status   : ${result.status}`);
console.log(`  processed: ${result.processed}`);
console.log(`  created  : ${result.created}`);
console.log(`  skipped  : ${result.skipped}`);
console.log(`  failed   : ${result.failed}`);

if (result.status === "failed" || result.created === 0) {
  console.log("\n신규 수집이 없으면 ingestion_runs.error_message를 확인한다.");
}
process.exit(result.status === "failed" ? 1 : 0);
