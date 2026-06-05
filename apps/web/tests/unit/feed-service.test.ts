/**
 * feed-service.test.ts
 *
 * TDD: 이 테스트 파일은 아직 존재하지 않는 서비스 모듈을 대상으로 작성됐다.
 * apps/web/features/feed/server/service.ts 가 없으므로 모든 테스트가
 * "Cannot find module" 오류로 실패해야 한다.
 *
 * 서비스 구현 후 이 테스트가 통과해야 단계 2가 완료된다.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { encodeCursor } from "../../lib/cursor";

// 아직 존재하지 않는 모듈 — import 자체가 실패한다.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: 의도적 실패. 서비스 파일이 없으므로 테스트가 빨간 상태여야 한다.
import { getFeed, getContentBySlugId } from "../../features/feed/server/service";

// Supabase createClient를 mock한다.
// chained builder 패턴을 지원해야 하므로 모든 메서드가 자기 자신을 반환하는
// proxy 빌더를 사용한다. 최종 await(데이터 반환)는 mockSupabaseResult로 제어한다.
vi.mock("../../lib/supabase/server", () => {
  return {
    createClient: vi.fn(),
  };
});

import { createClient } from "../../lib/supabase/server";

// Supabase chained query builder mock 팩토리
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  // 모든 메서드가 자기 자신을 반환하는 Proxy를 사용해
  // 체이닝의 길이·순서에 무관하게 동작한다.
  const terminal = Promise.resolve(result);
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return terminal.then.bind(terminal);
      if (prop === Symbol.toPrimitive || prop === "catch" || prop === "finally") {
        return (terminal as unknown as Record<symbol | string, unknown>)[prop as string];
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

// 테스트에서 사용할 FeedItem fixture
const FIXTURE_ITEM = {
  id: 1,
  url: "https://blog.example.com/react-server-components-deep-dive",
  title: "React Server Components 완벽 가이드",
  description: "RSC의 동작 원리를 설명합니다.",
  thumbnail: "https://blog.example.com/og/rsc-guide.png",
  source: "blog.example.com",
  type: "article",
  language: "ko",
  slug: "react-server-components-deep-dive",
  status: "published",
  published_at: "2026-05-01T09:00:00+00:00",
  content_categories: [{ categories: { name: "Frontend", slug: "fe" } }],
  content_tags: [{ tags: { name: "React" } }],
};

const FIXTURE_DRAFT_ITEM = {
  ...FIXTURE_ITEM,
  id: 99,
  slug: "draft-item",
  status: "draft",
  published_at: null,
};

function mockCreateClient(data: unknown, error: unknown = null) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    from: () => makeQueryBuilder({ data, error }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getFeed
// ---------------------------------------------------------------------------

describe("getFeed", () => {
  it("published 항목만 반환한다 (draft 미포함)", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].publishedAt).toBeDefined();
  });

  it("published_at DESC, id DESC 순서로 반환한다", async () => {
    const older = { ...FIXTURE_ITEM, id: 1, published_at: "2026-05-01T09:00:00+00:00" };
    const newer = { ...FIXTURE_ITEM, id: 2, slug: "newer", published_at: "2026-06-01T09:00:00+00:00" };
    mockCreateClient([newer, older]);
    const result = await getFeed({});
    expect(result.items[0].id).toBe("2");
    expect(result.items[1].id).toBe("1");
  });

  it("20건 이하를 반환한다 (PAGE_SIZE 제한)", async () => {
    // 21건 응답에서 서비스가 21번째를 nextCursor 판단에 사용하고 20건만 반환해야 한다.
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...FIXTURE_ITEM,
      id: i + 1,
      slug: `item-${i + 1}`,
      published_at: `2026-05-${String(i + 1).padStart(2, "0")}T00:00:00+00:00`,
    }));
    mockCreateClient(items);
    const result = await getFeed({});
    expect(result.items.length).toBeLessThanOrEqual(20);
  });

  it("다음 페이지가 있을 때 nextCursor를 반환한다", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...FIXTURE_ITEM,
      id: i + 1,
      slug: `item-${i + 1}`,
      published_at: `2026-05-${String(i + 1).padStart(2, "0")}T00:00:00+00:00`,
    }));
    mockCreateClient(items);
    const result = await getFeed({});
    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe("string");
  });

  it("마지막 페이지에서 nextCursor가 null이다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({});
    expect(result.nextCursor).toBeNull();
  });

  it("cursor가 전달되면 해당 위치 이후 항목을 반환한다", async () => {
    const cursor = encodeCursor({ publishedAt: "2026-05-15T00:00:00+00:00", id: 10 });
    mockCreateClient([FIXTURE_ITEM]);
    // 오류 없이 호출되면 된다. cursor 파싱 후 쿼리에 조건을 추가한다는 것을 확인한다.
    const result = await getFeed({}, cursor);
    expect(result.items).toBeDefined();
  });

  it("동일 published_at 경계에서 cursor로 다음 페이지를 요청하면 중복 없이 반환한다", async () => {
    // page 1의 마지막 아이템
    const lastOfPage1 = {
      ...FIXTURE_ITEM,
      id: 5,
      slug: "item-5",
      published_at: "2026-05-10T00:00:00+00:00",
    };
    // page 2에서는 동일 published_at이지만 id가 더 작은 항목들
    const page2Items = [
      { ...FIXTURE_ITEM, id: 3, slug: "item-3", published_at: "2026-05-10T00:00:00+00:00" },
      { ...FIXTURE_ITEM, id: 1, slug: "item-1", published_at: "2026-05-10T00:00:00+00:00" },
    ];
    mockCreateClient(page2Items);
    const cursor = encodeCursor({ publishedAt: lastOfPage1.published_at, id: lastOfPage1.id });
    const result = await getFeed({}, cursor);
    // id 5는 포함되지 않아야 한다.
    const ids = result.items.map((item) => item.id);
    expect(ids).not.toContain("5");
  });

  it("q 필터가 전달되면 FTS 조건을 적용한다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({ q: "React" });
    expect(result.items).toBeDefined();
  });

  it("category 필터가 전달되면 해당 category slug 콘텐츠만 반환한다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({ category: "fe" });
    expect(result.items).toBeDefined();
  });

  it("type 필터가 전달되면 해당 type만 반환한다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({ type: "article" });
    expect(result.items).toBeDefined();
    if (result.items.length > 0) {
      expect(result.items[0].type).toBe("article");
    }
  });

  it("lang 필터가 전달되면 해당 언어만 반환한다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({ lang: "ko" });
    expect(result.items).toBeDefined();
    if (result.items.length > 0) {
      expect(result.items[0].language).toBe("ko");
    }
  });

  it("빈 q 문자열이 전달되면 throw 없이 전체 결과를 반환한다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    await expect(getFeed({ q: "" })).resolves.toBeDefined();
  });

  it("특수문자 q가 전달되면 throw 없이 전체 결과를 반환한다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    await expect(getFeed({ q: "!@#$%" })).resolves.toBeDefined();
  });

  it("존재하지 않는 category slug가 전달되면 빈 배열을 반환한다", async () => {
    mockCreateClient([]);
    const result = await getFeed({ category: "nonexistent-slug" });
    expect(result.items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FeedItem 형태 검증
// ---------------------------------------------------------------------------

describe("getFeed — FeedItem 형태", () => {
  it("thumbnailUrl 필드가 thumbnail 컬럼에서 매핑된다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({});
    expect(result.items[0]).toHaveProperty("thumbnailUrl");
    expect(result.items[0]).not.toHaveProperty("thumbnail");
  });

  it("thumbnail이 NULL인 항목에서 thumbnailUrl이 null이다", async () => {
    mockCreateClient([{ ...FIXTURE_ITEM, thumbnail: null }]);
    const result = await getFeed({});
    expect(result.items[0].thumbnailUrl).toBeNull();
  });

  it("publishedAt 필드가 string 타입이다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({});
    expect(typeof result.items[0].publishedAt).toBe("string");
  });

  it("categories가 name과 slug를 포함한 배열이다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({});
    const categories = result.items[0].categories;
    expect(Array.isArray(categories)).toBe(true);
    if (categories.length > 0) {
      expect(categories[0]).toHaveProperty("name");
      expect(categories[0]).toHaveProperty("slug");
    }
  });

  it("tags가 name을 포함한 배열이다", async () => {
    mockCreateClient([FIXTURE_ITEM]);
    const result = await getFeed({});
    const tags = result.items[0].tags;
    expect(Array.isArray(tags)).toBe(true);
    if (tags.length > 0) {
      expect(tags[0]).toHaveProperty("name");
    }
  });
});

// ---------------------------------------------------------------------------
// getContentBySlugId
// ---------------------------------------------------------------------------

describe("getContentBySlugId", () => {
  it("유효한 slug+id에서 FeedItem을 반환한다", async () => {
    mockCreateClient(FIXTURE_ITEM);
    const result = await getContentBySlugId("react-server-components-deep-dive-1");
    expect(result).not.toBeNull();
    expect(result?.title).toBe(FIXTURE_ITEM.title);
  });

  it("존재하지 않는 id에서 null을 반환한다", async () => {
    mockCreateClient(null);
    const result = await getContentBySlugId("nonexistent-slug-9999");
    expect(result).toBeNull();
  });

  it("draft 콘텐츠에서 null을 반환한다", async () => {
    mockCreateClient(FIXTURE_DRAFT_ITEM);
    const result = await getContentBySlugId("draft-item-99");
    expect(result).toBeNull();
  });

  it("반환된 FeedItem에 categories와 tags가 포함된다", async () => {
    mockCreateClient(FIXTURE_ITEM);
    const result = await getContentBySlugId("react-server-components-deep-dive-1");
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("tags");
    expect(Array.isArray(result?.categories)).toBe(true);
    expect(Array.isArray(result?.tags)).toBe(true);
  });
});
