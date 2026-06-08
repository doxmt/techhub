import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../features/ingestion/server/backfill-og", () => ({
  runOgBackfill: vi.fn(),
}));

import { GET } from "./route";
import { runOgBackfill } from "../../../../features/ingestion/server/backfill-og";

const CRON_SECRET = "test-secret";

function makeRequest(secret?: string) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return new Request("http://localhost/api/cron/backfill-og", { headers });
}

describe("GET /api/cron/backfill-og", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  it("CRON_SECRET 없으면 401을 반환한다", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("잘못된 CRON_SECRET이면 401을 반환한다", async () => {
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("올바른 CRON_SECRET이면 runOgBackfill을 호출하고 200을 반환한다", async () => {
    (runOgBackfill as ReturnType<typeof vi.fn>).mockResolvedValue({
      processed: 10,
      updated: 7,
      failed: 0,
    });

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    expect(runOgBackfill).toHaveBeenCalledOnce();
  });
});
