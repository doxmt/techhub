import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("./og-scraper", () => ({
  fetchOgMeta: vi.fn(),
}));

import { runOgBackfill } from "./backfill-og";
import { createAdminClient } from "../../../lib/supabase/admin";
import { fetchOgMeta } from "./og-scraper";

const ITEMS = [
  { id: 1, url: "https://tech.kakao.com/a/", thumbnail: null, description: null },
  { id: 2, url: "https://tech.kakao.com/b/", thumbnail: null, description: "있는설명" },
];

function makeAdminMock(items: unknown[]) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "content_items") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: items, error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    }),
  };
}

describe("runOgBackfill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("thumbnail/description이 NULL인 아이템을 처리한다", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeAdminMock(ITEMS));
    (fetchOgMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: "https://example.com/og.jpg",
      description: "OG 설명",
    });

    const result = await runOgBackfill();

    expect(result.processed).toBe(2);
    expect(fetchOgMeta).toHaveBeenCalledTimes(2);
  });

  it("OG 데이터가 없으면 updated 카운트가 0이다", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeAdminMock(ITEMS));
    (fetchOgMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: null,
      description: null,
    });

    const result = await runOgBackfill();

    expect(result.updated).toBe(0);
  });

  it("OG 데이터를 가져오면 updated 카운트가 증가한다", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeAdminMock(ITEMS));
    (fetchOgMeta as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: "https://example.com/og.jpg",
      description: "설명",
    });

    const result = await runOgBackfill();

    expect(result.updated).toBeGreaterThan(0);
  });

  it("대상 아이템이 없으면 즉시 반환한다", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeAdminMock([]));

    const result = await runOgBackfill();

    expect(result.processed).toBe(0);
    expect(fetchOgMeta).not.toHaveBeenCalled();
  });
});
