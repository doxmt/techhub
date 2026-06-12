import { describe, expect, it, vi } from "vitest";

vi.mock("../_handler", () => ({
  handleIngestCron: vi.fn(),
}));

import { handleIngestCron } from "../_handler";
import { GET } from "./route";

describe("GET /api/cron/ingest/articles", () => {
  it("article section으로 cron handler를 호출한다", async () => {
    const req = new Request("http://localhost/api/cron/ingest/articles");
    await GET(req);

    expect(handleIngestCron).toHaveBeenCalledWith(req, "article");
  });
});
