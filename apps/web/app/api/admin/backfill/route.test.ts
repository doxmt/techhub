/**
 * route.test.ts
 *
 * GET /api/admin/backfill Route Handler 단위 테스트:
 * - Authorization 헤더 없음 → 401
 * - 잘못된 토큰 → 401
 * - CRON_SECRET 미설정 → 401
 * - 올바른 Bearer ${CRON_SECRET} → 200 + JSON { created, skipped, failed }
 * - 서비스 예외 → 500
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../features/ingestion/server/backfill", () => ({
  runWoowahBackfill: vi.fn(),
}));

// @ts-expect-error 의도적 실패 — route.ts 미존재
import { GET } from "./route";

import { runWoowahBackfill } from "../../../../features/ingestion/server/backfill";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/admin/backfill", {
    method: "GET",
    headers,
  });
}

const MOCK_RESULT = { created: 100, skipped: 50, failed: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

describe("GET /api/admin/backfill — 인증 실패", () => {
  it("Authorization 헤더 없으면 401을 반환한다", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("잘못된 토큰이면 401을 반환한다", async () => {
    const res = await GET(makeRequest({ Authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("CRON_SECRET 미설정이면 401을 반환한다", async () => {
    const orig = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest({ Authorization: "Bearer any" }));
    expect(res.status).toBe(401);
    process.env.CRON_SECRET = orig;
  });

  it("인증 실패 시 runWoowahBackfill이 호출되지 않는다", async () => {
    await GET(makeRequest());
    expect(runWoowahBackfill).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/backfill — 인증 성공", () => {
  it("올바른 토큰으로 요청하면 200을 반환한다", async () => {
    (runWoowahBackfill as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RESULT);
    const res = await GET(makeRequest({ Authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
  });

  it("응답 JSON에 created, skipped, failed 필드가 있다", async () => {
    (runWoowahBackfill as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_RESULT);
    const res = await GET(makeRequest({ Authorization: "Bearer test-secret" }));
    const body = await res.json();
    expect(body).toHaveProperty("created", 100);
    expect(body).toHaveProperty("skipped", 50);
    expect(body).toHaveProperty("failed", 2);
  });

  it("서비스 예외 시 500을 반환한다", async () => {
    (runWoowahBackfill as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await GET(makeRequest({ Authorization: "Bearer test-secret" }));
    expect(res.status).toBe(500);
  });
});
