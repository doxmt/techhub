import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getSavedFeed, getSavedCounts } from "./service";
import { createClient } from "../../../lib/supabase/server";

type QueryResult = { data?: unknown; error: unknown; count?: number | null };

/**
 * PostgREST 빌더처럼 모든 필터가 체이닝되고 await 시점에 결과를 돌려주는 mock.
 * results를 여러 개 주면 from() 호출 순서대로 소비한다.
 */
function makeSupabaseMock(...results: QueryResult[]) {
  const calls: { table: string; select: unknown[]; eq: unknown[][] }[] = [];
  let index = 0;

  const from = vi.fn((table: string) => {
    const result = results[Math.min(index, results.length - 1)]!;
    index += 1;
    const record = { table, select: [] as unknown[], eq: [] as unknown[][] };
    calls.push(record);

    const builder = {
      select: vi.fn((...args: unknown[]) => {
        record.select.push(args);
        return builder;
      }),
      eq: vi.fn((...args: unknown[]) => {
        record.eq.push(args);
        return builder;
      }),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      lt: vi.fn(() => builder),
      then: (resolve: (value: QueryResult) => unknown) => resolve(result),
    };
    return builder;
  });

  return { client: { from }, calls };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    created_at: "2026-06-05T10:00:00Z",
    content_items: {
      id: 1,
      url: "https://example.com",
      title: "테스트 아티클",
      description: "설명",
      thumbnail: null,
      source: "TestSource",
      type: "article",
      section: "article",
      language: "ko",
      slug: "test-article",
      published_at: "2026-06-01T00:00:00Z",
      deadline: null,
      contest_type: null,
      status: "published",
      content_categories: [],
      content_tags: [],
      ...overrides,
    },
  };
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
    const { client } = makeSupabaseMock({ data: null, error: { message: "DB error" } });
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("북마크 데이터를 FeedItem 배열로 매핑한다", async () => {
    const { client } = makeSupabaseMock({ data: [makeRow()], error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("1");
    expect(result.items[0]!.title).toBe("테스트 아티클");
    expect(result.items[0]!.isBookmarked).toBe(true);
    expect(result.nextCursor).toBeNull();
  });

  it("content_items가 null인 행은 필터링한다", async () => {
    const { client } = makeSupabaseMock({
      data: [{ created_at: "2026-06-05T10:00:00Z", content_items: null }],
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result.items).toHaveLength(0);
  });

  it("PAGE_SIZE를 초과하면 nextCursor를 반환한다", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      created_at: `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      content_items: { ...makeRow().content_items, id: i + 1 },
    }));
    const { client } = makeSupabaseMock({ data: rows, error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getSavedFeed({ userId: "user-1" });
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("2026-06-20T00:00:00Z");
  });

  it("section을 지정하면 content_items.section으로 서버에서 필터링한다", async () => {
    const { client, calls } = makeSupabaseMock({ data: [], error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);
    await getSavedFeed({ userId: "user-1", section: "contest" });
    expect(calls[0]!.eq).toContainEqual(["content_items.section", "contest"]);
    expect(String(calls[0]!.select[0])).toContain("content_items!inner");
  });

  it("section이 all이면 섹션 필터를 걸지 않는다", async () => {
    const { client, calls } = makeSupabaseMock({ data: [], error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);
    await getSavedFeed({ userId: "user-1", section: "all" });
    const sectionFilters = calls[0]!.eq.filter(
      ([column]) => column === "content_items.section",
    );
    expect(sectionFilters).toHaveLength(0);
  });
});

describe("getSavedCounts", () => {
  it("userId가 null이면 모두 0을 반환한다", async () => {
    const result = await getSavedCounts(null);
    expect(result).toEqual({ all: 0, news: 0, article: 0, contest: 0, event: 0 });
  });

  it("섹션별 집계 결과를 반환한다", async () => {
    const { client } = makeSupabaseMock(
      { count: 10, error: null },
      { count: 3, error: null },
      { count: 5, error: null },
      { count: 2, error: null },
      { count: 1, error: null },
    );
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getSavedCounts("user-1");
    expect(result).toEqual({ all: 10, news: 3, article: 5, contest: 2, event: 1 });
  });

  it("집계 실패 시 0으로 처리한다", async () => {
    const { client } = makeSupabaseMock({ count: null, error: { message: "boom" } });
    vi.mocked(createClient).mockResolvedValue(client as never);
    const result = await getSavedCounts("user-1");
    expect(result).toEqual({ all: 0, news: 0, article: 0, contest: 0, event: 0 });
  });
});
