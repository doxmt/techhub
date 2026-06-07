/**
 * backfill.test.ts
 *
 * runWoowahBackfill(): 우아한형제들 WordPress API 전체 수집
 * - 페이지 1개 수집 후 100개 미만이면 종료
 * - 빈 배열 반환 시 즉시 종료
 * - created/skipped/failed 카운트 반환
 * - ON CONFLICT DO NOTHING으로 중복 skip
 * - HTML 태그 제거
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// @ts-expect-error 의도적 실패 — backfill.ts 미존재
import { runWoowahBackfill } from "./backfill";

import { createAdminClient } from "../../../lib/supabase/admin";

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

function makePost(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: { rendered: `포스트 제목 ${id}` },
    link: `https://techblog.woowahan.com/${id}/`,
    date: "2024-01-15T09:00:00",
    excerpt: { rendered: `<p>포스트 ${id} 요약</p>` },
    ...overrides,
  };
}

function makeAdminClientMock(options: {
  insertResult?: { data: unknown; error: unknown; count?: number | null };
  categoriesResult?: { data: unknown; error: unknown };
  contentCatResult?: { data: unknown; error: unknown };
} = {}) {
  const {
    insertResult = { data: [{ id: 1 }], error: null, count: 1 },
    categoriesResult = { data: [], error: null },
    contentCatResult = { data: null, error: null },
  } = options;

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "categories") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(categoriesResult),
      };
    }
    if (table === "content_categories") {
      return {
        insert: vi.fn().mockResolvedValue(contentCatResult),
      };
    }
    if (table === "content_items") {
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(insertResult),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return { from: fromMock };
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

describe("runWoowahBackfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("빈 배열 반환 시 즉시 종료하고 created=0을 반환한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock(),
    );

    const result = await runWoowahBackfill();

    expect(result.created).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("100개 미만 반환 시 다음 페이지를 요청하지 않는다", async () => {
    const posts = Array.from({ length: 3 }, (_, i) => makePost(i + 1));
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => posts,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({ insertResult: { data: [{ id: 1 }, { id: 2 }, { id: 3 }], error: null, count: 3 } }),
    );

    const result = await runWoowahBackfill();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(3);
  });

  it("100개 반환 시 다음 페이지를 요청한다", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makePost(i + 1));
    const page2: unknown[] = [];

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: async () => (callCount === 1 ? page1 : page2),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({ insertResult: { data: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })), error: null, count: 100 } }),
    );

    await runWoowahBackfill();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("insert 오류 시 failed 카운트가 증가한다", async () => {
    const posts = [makePost(1)];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => posts,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({ insertResult: { data: null, error: { message: "DB error" }, count: null } }),
    );

    const result = await runWoowahBackfill();

    expect(result.failed).toBeGreaterThanOrEqual(1);
  });

  it("ON CONFLICT DO NOTHING으로 count=0이면 skipped가 증가한다", async () => {
    const posts = [makePost(1)];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => posts,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({ insertResult: { data: [], error: null, count: 0 } }),
    );

    const result = await runWoowahBackfill();

    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.created).toBe(0);
  });

  it("반환값에 created, skipped, failed 필드가 존재한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock(),
    );

    const result = await runWoowahBackfill();

    expect(result).toHaveProperty("created");
    expect(result).toHaveProperty("skipped");
    expect(result).toHaveProperty("failed");
  });

  it("fetch 오류 시 failed 카운트가 증가한다", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock(),
    );

    const result = await runWoowahBackfill();

    expect(result.failed).toBeGreaterThanOrEqual(1);
  });
});
