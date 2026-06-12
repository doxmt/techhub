import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../features/ingestion/server/service", () => ({
  runIngestion: vi.fn(),
}));

import { runIngestion } from "../../../../features/ingestion/server/service";
import { handleIngestCron } from "./_handler";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/ingest/news", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret-value";
  (runIngestion as ReturnType<typeof vi.fn>).mockResolvedValue({
    status: "success",
    processed: 10,
    created: 8,
    skipped: 2,
    failed: 0,
  });
});

describe("handleIngestCron", () => {
  it("올바른 토큰과 section으로 runIngestion을 호출한다", async () => {
    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });

    const res = await handleIngestCron(req, "news");

    expect(res.status).toBe(200);
    expect(runIngestion).toHaveBeenCalledWith({ section: "news" });
  });

  it("section이 없으면 전체 수집으로 호출한다", async () => {
    const req = makeRequest({ Authorization: "Bearer test-cron-secret-value" });

    await handleIngestCron(req);

    expect(runIngestion).toHaveBeenCalledWith(undefined);
  });

  it("토큰이 틀리면 수집을 실행하지 않는다", async () => {
    const req = makeRequest({ Authorization: "Bearer wrong-token" });

    const res = await handleIngestCron(req, "article");

    expect(res.status).toBe(401);
    expect(runIngestion).not.toHaveBeenCalled();
  });
});
