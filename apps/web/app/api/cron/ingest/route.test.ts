/**
 * route.test.ts
 *
 * TDD Red 단계: apps/web/app/api/cron/ingest/route.ts 가 아직 없으므로
 * "Cannot find module" 오류로 모든 테스트가 실패해야 한다.
 *
 * GET /api/cron/ingest Route Handler 단위 테스트:
 * - Authorization 헤더 없음 → 401
 * - 잘못된 토큰 → 401
 * - CRON_SECRET 미설정 → 401
 * - 올바른 Bearer ${CRON_SECRET} → 200 + JSON 요약
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../features/ingestion/server/service", () => ({
  runIngestion: vi.fn(),
}));

// @ts-expect-error 의도적 실패 — route.ts 미존재
import { GET } from "./route";

import { runIngestion } from "../../../../features/ingestion/server/service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/ingest", {
    method: "GET",
    headers,
  });
}

const MOCK_INGESTION_RESULT = {
  status: "success" as const,
  processed: 10,
  created: 8,
  skipped: 2,
  failed: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  // 각 테스트에서 환경변수를 명시적으로 설정한다
  process.env.CRON_SECRET = "test-cron-secret-value";
});

// ---------------------------------------------------------------------------
// 인증 실패 케이스 → 401
// ---------------------------------------------------------------------------

describe("GET /api/cron/ingest — 인증 실패", () => {
  it("Authorization 헤더가 없으면 401을 반환한다", async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("Authorization 헤더가 없을 때 수집이 실행되지 않는다", async () => {
    const req = makeRequest();
    await GET(req);
    expect(runIngestion).not.toHaveBeenCalled();
  });

  it("잘못된 토큰으로 요청하면 401을 반환한다", async () => {
    const req = makeRequest({ Authorization: "Bearer wrong-token" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("잘못된 토큰으로 요청하면 수집이 실행되지 않는다", async () => {
    const req = makeRequest({ Authorization: "Bearer wrong-token" });
    await GET(req);
    expect(runIngestion).not.toHaveBeenCalled();
  });

  it("Bearer 형식이 아닌 헤더로 요청하면 401을 반환한다", async () => {
    const req = makeRequest({ Authorization: "test-cron-secret-value" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("Bearer 뒤 토큰이 없으면 401을 반환한다", async () => {
    const req = makeRequest({ Authorization: "Bearer " });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("CRON_SECRET 환경변수가 미설정되면 401을 반환한다", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const req = makeRequest({ Authorization: "Bearer any-token" });
    const res = await GET(req);

    expect(res.status).toBe(401);

    process.env.CRON_SECRET = original;
  });

  it("CRON_SECRET이 미설정될 때 수집이 실행되지 않는다", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const req = makeRequest({ Authorization: "Bearer any-token" });
    await GET(req);

    expect(runIngestion).not.toHaveBeenCalled();

    process.env.CRON_SECRET = original;
  });

  it("CRON_SECRET이 빈 문자열이면 401을 반환한다", async () => {
    process.env.CRON_SECRET = "";

    const req = makeRequest({ Authorization: "Bearer " });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 인증 성공 케이스 → 200 + JSON 요약
// ---------------------------------------------------------------------------

describe("GET /api/cron/ingest — 인증 성공", () => {
  it("올바른 Bearer 토큰으로 요청하면 200을 반환한다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it("올바른 토큰으로 요청하면 runIngestion이 호출된다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    await GET(req);

    expect(runIngestion).toHaveBeenCalledTimes(1);
  });

  it("200 응답 본문이 JSON 형태의 수집 요약을 포함한다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);

    const body = await res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  it("응답 JSON에 status 필드가 포함된다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);
    const body = await res.json();

    expect(body).toHaveProperty("status");
  });

  it("응답 JSON에 created 카운트가 포함된다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);
    const body = await res.json();

    expect(body).toHaveProperty("created");
    expect(body.created).toBe(8);
  });

  it("응답 JSON에 skipped 카운트가 포함된다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);
    const body = await res.json();

    expect(body).toHaveProperty("skipped");
    expect(body.skipped).toBe(2);
  });

  it("응답 JSON에 processed 카운트가 포함된다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_INGESTION_RESULT);

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);
    const body = await res.json();

    expect(body).toHaveProperty("processed");
  });

  it("partial 상태에서도 200을 반환한다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_INGESTION_RESULT,
      status: "partial",
      failed: 1,
    });

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it("수집 서비스가 예외를 던지면 500을 반환한다", async () => {
    (runIngestion as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected DB error"));

    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
