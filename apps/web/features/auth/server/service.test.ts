import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getSavedFeed } from "./service";
import { createClient } from "../../../lib/supabase/server";

function makeSupabaseMock(selectResult: { data: unknown; error: unknown }) {
  const queryMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lt: vi.fn().mockResolvedValue(selectResult),
  };
  queryMock.limit.mockResolvedValue(selectResult);
  return { from: vi.fn(() => queryMock) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSavedFeed", () => {
  it("userId가 null이면 빈 결과를 반환한다", async () => {
    const result = await getSavedFeed({ userId: null });
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("DB 오류 시 빈 결과를 반환한다", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ data: null, error: { message: "DB error" } }) as never,
    );
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("북마크 데이터를 FeedItem 배열로 매핑한다", async () => {
    const mockRow = {
      created_at: "2026-06-05T10:00:00Z",
      content_items: {
        id: 1,
        url: "https://example.com",
        title: "테스트 아티클",
        description: "설명",
        thumbnail: null,
        source: "TestSource",
        type: "article",
        language: "ko",
        slug: "test-article",
        published_at: "2026-06-01T00:00:00Z",
        status: "published",
        content_categories: [],
        content_tags: [],
      },
    };
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ data: [mockRow], error: null }) as never,
    );
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("1");
    expect(result.items[0].title).toBe("테스트 아티클");
    expect(result.items[0].isBookmarked).toBe(true);
    expect(result.nextCursor).toBeNull();
  });

  it("content_items가 null인 행은 필터링한다", async () => {
    const mockRows = [
      { created_at: "2026-06-05T10:00:00Z", content_items: null },
    ];
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ data: mockRows, error: null }) as never,
    );
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result.items).toHaveLength(0);
  });
});
