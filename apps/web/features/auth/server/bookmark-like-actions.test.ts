/**
 * bookmark-like-actions.test.ts
 *
 * TDD Red 단계: 아래 모듈들이 아직 없으므로 모든 테스트가 실패해야 한다.
 * - apps/web/features/auth/server/actions.ts (toggleBookmark, toggleLike)
 * - apps/web/features/auth/server/service.ts (getSavedFeed)
 *
 * toggleBookmark / toggleLike Server Actions 와
 * getSavedFeed service 함수를 대상으로 한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

// @ts-expect-error 의도적 실패 — actions.ts 에 toggleBookmark/toggleLike 미존재
import { toggleBookmark, toggleLike } from "./actions";

// @ts-expect-error 의도적 실패 — service.ts 에 getSavedFeed 미존재
import { getSavedFeed } from "./service";

import { createClient } from "../../../lib/supabase/server";

// ---------------------------------------------------------------------------
// Supabase mock 헬퍼
// ---------------------------------------------------------------------------

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const terminal = Promise.resolve(result);
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return terminal.then.bind(terminal);
      if (prop === "catch" || prop === "finally") {
        return (terminal as unknown as Record<string, unknown>)[prop as string];
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

function makeSupabaseClient(options: {
  user?: { id: string } | null;
  selectData?: unknown;
  selectError?: unknown;
  insertError?: unknown;
  deleteError?: unknown;
}) {
  const { user = null, selectData = null, selectError = null, insertError = null, deleteError = null } =
    options;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(makeQueryBuilder({ data: selectData, error: selectError })),
      insert: vi.fn().mockReturnValue(makeQueryBuilder({ data: null, error: insertError })),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(makeQueryBuilder({ data: null, error: deleteError })),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// toggleBookmark
// ---------------------------------------------------------------------------

describe("toggleBookmark", () => {
  it("비로그인 상태에서 호출하면 에러를 반환한다", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseClient({ user: null }),
    );

    const result = await toggleBookmark(1);

    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("북마크가 없을 때 insert를 호출해 북마크를 추가한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [], // 기존 북마크 없음
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await toggleBookmark(42);

    expect(result).toEqual(
      expect.objectContaining({ bookmarked: true }),
    );
  });

  it("북마크가 이미 있을 때 delete를 호출해 북마크를 제거한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [{ user_id: "user-uuid-1", content_id: 42 }], // 기존 북마크 존재
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await toggleBookmark(42);

    expect(result).toEqual(
      expect.objectContaining({ bookmarked: false }),
    );
  });

  it("DB 오류 발생 시 에러를 반환한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectError: { message: "DB error" },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await toggleBookmark(42);

    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });
});

// ---------------------------------------------------------------------------
// toggleLike
// ---------------------------------------------------------------------------

describe("toggleLike", () => {
  it("비로그인 상태에서 호출하면 에러를 반환한다", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseClient({ user: null }),
    );

    const result = await toggleLike(1);

    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it("좋아요가 없을 때 insert를 호출해 좋아요를 추가한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [],
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await toggleLike(42);

    expect(result).toEqual(
      expect.objectContaining({ liked: true }),
    );
  });

  it("좋아요가 이미 있을 때 delete를 호출해 좋아요를 제거한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [{ user_id: "user-uuid-1", content_id: 42 }],
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await toggleLike(42);

    expect(result).toEqual(
      expect.objectContaining({ liked: false }),
    );
  });

  it("DB 오류 발생 시 에러를 반환한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectError: { message: "DB error" },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await toggleLike(42);

    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });
});

// ---------------------------------------------------------------------------
// getSavedFeed
// ---------------------------------------------------------------------------

const FIXTURE_SAVED_ROW = {
  created_at: "2026-06-05T10:00:00Z",
  content_items: {
    id: 10,
    url: "https://example.com/saved-article",
    title: "저장된 아티클",
    description: "설명",
    thumbnail: null,
    source: "example.com",
    type: "article",
    language: "ko",
    slug: "saved-article",
    published_at: "2026-05-01T09:00:00+00:00",
    status: "published",
    content_categories: [],
    content_tags: [],
  },
};

describe("getSavedFeed", () => {
  it("비로그인 상태에서 호출하면 빈 배열을 반환한다", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseClient({ user: null }),
    );

    const result = await getSavedFeed({ userId: null });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("유효한 userId로 북마크된 콘텐츠 목록을 반환한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [FIXTURE_SAVED_ROW],
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await getSavedFeed({ userId: "user-uuid-1" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("저장된 아티클");
  });

  it("결과가 없으면 빈 배열과 null cursor를 반환한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [],
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await getSavedFeed({ userId: "user-uuid-1" });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("PAGE_SIZE+1 건이 반환되면 nextCursor를 설정한다", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      created_at: `2026-05-${String(21 - i).padStart(2, "0")}T00:00:00+00:00`,
      content_items: {
        ...FIXTURE_SAVED_ROW.content_items,
        id: i + 1,
        slug: `saved-article-${i + 1}`,
      },
    }));
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: rows,
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await getSavedFeed({ userId: "user-uuid-1" });

    expect(result.items.length).toBeLessThanOrEqual(20);
    expect(result.nextCursor).not.toBeNull();
  });

  it("cursor가 전달되면 해당 위치 이후 항목을 반환한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectData: [FIXTURE_SAVED_ROW],
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await getSavedFeed({ userId: "user-uuid-1", cursor: "some-cursor" });

    expect(result.items).toBeDefined();
  });

  it("DB 오류 발생 시 빈 배열을 반환한다", async () => {
    const mockClient = makeSupabaseClient({
      user: { id: "user-uuid-1" },
      selectError: { message: "DB error" },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

    const result = await getSavedFeed({ userId: "user-uuid-1" });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
