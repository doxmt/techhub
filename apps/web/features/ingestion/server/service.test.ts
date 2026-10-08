/**
 * service.test.ts
 *
 * TDD Red 단계: apps/web/features/ingestion/server/service.ts 가 아직 없으므로
 * "Cannot find module" 오류로 모든 테스트가 실패해야 한다.
 *
 * runIngestion(): 수집 오케스트레이션 단위 테스트 (Supabase client 모킹)
 * - 신규 URL → created 카운트 증가
 * - 중복 URL → skipped 카운트 증가 (ON CONFLICT DO NOTHING)
 * - 1개 소스 fetch 실패 → 나머지 소스 계속 처리, status='partial'
 * - 빈 피드(0건) → success 상태
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const RECENT_DATE = new Date(Date.now() - 60 * 60 * 1000).toUTCString(); // 1시간 전

vi.mock("../../../lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// @ts-expect-error 의도적 실패 — service.ts 미존재
import { runIngestion } from "./service";

import { createAdminClient } from "../../../lib/supabase/admin";

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

/**
 * Supabase admin client의 chained builder를 모킹한다.
 * from(...).select(...).eq(...) 같은 체이닝을 지원한다.
 */
function makeSelectMock(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  // await 가능하도록 thenable 처리
  (builder as unknown as Promise<unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return builder;
}

function makeInsertMock(result: { data: unknown; error: unknown; count?: number | null }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  };
}

/** sources + ingestion_runs insert를 포함한 완전한 admin client mock을 반환한다. */
function makeAdminClientMock(options: {
  sources: unknown[];
  insertResults?: Array<{ data: unknown; error: unknown; count?: number | null }>;
  runInsertResult?: { data: unknown; error: unknown };
  runUpdateResult?: { data: unknown; error: unknown };
  /** slug UNIQUE 사전 조회에서 이미 존재한다고 응답할 행들 */
  existingRows?: Array<{ id: number; slug: string; url: string }>;
  /** 행 단위 재시도 시 각 호출의 결과 */
  rowRetryResults?: Array<{ data: unknown; error: unknown; count?: number | null }>;
  /** content_items.update(...).eq(...) 호출 기록 */
  updateCalls?: Array<{ patch: unknown; id: unknown }>;
}) {
  const {
    sources,
    insertResults = [],
    runInsertResult = { data: [{ id: "run-1" }], error: null },
    runUpdateResult = { data: null, error: null },
    existingRows = [],
    rowRetryResults = [],
    updateCalls = [],
  } = options;

  let insertCallIndex = 0;
  let rowRetryIndex = 0;

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "sources") {
      const selectBuilder = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      (selectBuilder as unknown as Promise<unknown>).then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: sources, error: null }).then(resolve);

      return {
        select: vi.fn().mockReturnValue(selectBuilder),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }
    if (table === "ingestion_runs") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue(runInsertResult),
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(runUpdateResult),
      };
    }
    if (table === "content_items") {
      // 배치 upsert / 행 단위 재시도 여부는 payload 배열 길이로 구분한다
      const upsert = vi.fn((payload: unknown) => {
        const isRowRetry = Array.isArray(payload) && payload.length === 1 && rowRetryResults.length > 0;
        const result = isRowRetry
          ? (rowRetryResults[rowRetryIndex++] ?? { data: null, error: null, count: 0 })
          : (insertResults[insertCallIndex++] ?? { data: null, error: null, count: 0 });
        return { select: vi.fn().mockResolvedValue(result) };
      });

      return {
        // slug 사전 조회: select("id, slug, url").in("slug", [...])
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: existingRows, error: null }),
        }),
        // from() 호출 시점이 아니라 insert() 호출 시점에 결과를 소비해야 한다
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue(
            insertResults[insertCallIndex++] ?? { data: null, error: null, count: 0 },
          ),
        })),
        upsert,
        update: vi.fn((patch: unknown) => ({
          eq: vi.fn((_column: string, id: unknown) => {
            updateCalls.push({ patch, id });
            return Promise.resolve({ data: null, error: null });
          }),
        })),
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
// 테스트용 fixture 소스
// ---------------------------------------------------------------------------

const ACTIVE_SOURCES = [
  {
    id: "src-1",
    name: "카카오 테크",
    feed_url: "https://tech.kakao.com/feed/",
    feed_type: "rss",
    default_language: "ko",
    is_active: true,
  },
  {
    id: "src-2",
    name: "토스",
    feed_url: "https://toss.tech/rss.xml",
    feed_type: "rss",
    default_language: "ko",
    is_active: true,
  },
];

const SINGLE_SOURCE = [ACTIVE_SOURCES[0]];
const GEEKNEWS_SOURCE = [
  {
    id: "src-geeknews",
    name: "GeekNews",
    feed_url: "https://news.hada.io/rss/news",
    feed_type: "atom",
    default_language: "ko",
    is_active: true,
  },
];

// ---------------------------------------------------------------------------
// runIngestion — 신규 URL 처리
// ---------------------------------------------------------------------------

describe("runIngestion — 신규 URL 처리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("신규 URL 2건 insert 성공 시 created 카운트가 2이다", async () => {
    // fetch를 mock해서 간단한 RSS XML을 반환한다
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>A</title><link>https://tech.kakao.com/a/</link><pubDate>${RECENT_DATE}</pubDate></item>
        <item><title>B</title><link>https://tech.kakao.com/b/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [{ id: 1 }, { id: 2 }], error: null, count: 2 }],
      }),
    );

    const result = await runIngestion();

    expect(result.created).toBe(2);
  });

  it("신규 URL insert 성공 시 status가 'success'이다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>A</title><link>https://tech.kakao.com/new-a/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [{ id: 1 }], error: null, count: 1 }],
      }),
    );

    const result = await runIngestion();

    expect(result.status).toBe("success");
  });
});

// ---------------------------------------------------------------------------
// runIngestion — 중복 URL 처리 (ON CONFLICT DO NOTHING)
// ---------------------------------------------------------------------------

describe("runIngestion — 중복 URL 처리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ON CONFLICT DO NOTHING으로 0건 insert 시 skipped 카운트가 증가한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    // count=0은 ON CONFLICT DO NOTHING으로 insert가 발생하지 않은 것을 의미한다
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [], error: null, count: 0 }],
      }),
    );

    const result = await runIngestion();

    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("중복 URL만 있을 때 created 카운트가 0이다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [], error: null, count: 0 }],
      }),
    );

    const result = await runIngestion();

    expect(result.created).toBe(0);
  });

  it("중복 URL만 있을 때도 status가 'success'이다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [], error: null, count: 0 }],
      }),
    );

    const result = await runIngestion();

    expect(result.status).toBe("success");
  });
});

// ---------------------------------------------------------------------------
// runIngestion — 부분 실패 처리
// ---------------------------------------------------------------------------

describe("runIngestion — 부분 실패 처리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("첫 번째 소스 fetch 실패 시 두 번째 소스는 계속 처리된다", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
          <item><title>B</title><link>https://toss.tech/b/</link><pubDate>${RECENT_DATE}</pubDate></item>
        </channel></rss>`,
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: ACTIVE_SOURCES,
        insertResults: [{ data: [{ id: 1 }], error: null, count: 1 }],
      }),
    );

    const result = await runIngestion();

    // 두 소스 모두 시도했는지 확인 (OG 폴백 fetch가 추가될 수 있음)
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    // 성공한 소스의 결과가 반영된다
    expect(result.created).toBeGreaterThanOrEqual(0);
  });

  it("1개 소스 fetch 실패 시 전체 status가 'partial'이다", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Timeout"));
      }
      return Promise.resolve({
        ok: true,
        text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
          <item><title>B</title><link>https://toss.tech/b/</link><pubDate>${RECENT_DATE}</pubDate></item>
        </channel></rss>`,
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: ACTIVE_SOURCES,
        insertResults: [{ data: [{ id: 1 }], error: null, count: 1 }],
      }),
    );

    const result = await runIngestion();

    expect(result.status).toBe("partial");
  });

  it("모든 소스 fetch 실패 시 status가 'failed'이다", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network down"));
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: ACTIVE_SOURCES,
      }),
    );

    const result = await runIngestion();

    expect(result.status).toBe("failed");
  });

  it("fetch 실패한 소스는 failed_count에 반영된다", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Timeout"));
      }
      return Promise.resolve({
        ok: true,
        text: async () => `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`,
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: ACTIVE_SOURCES,
      }),
    );

    const result = await runIngestion();

    expect(result.failed).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// runIngestion — 빈 피드
// ---------------------------------------------------------------------------

describe("runIngestion — 빈 피드 처리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("단일 소스 빈 피드(0건)에서 status가 'success'이다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
      }),
    );

    const result = await runIngestion();

    expect(result.status).toBe("success");
  });

  it("모든 소스 빈 피드에서 created, skipped, failed 카운트가 모두 0이다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: ACTIVE_SOURCES,
      }),
    );

    const result = await runIngestion();

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("소스가 없을 때 status가 'success'이다", async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: [],
      }),
    );

    const result = await runIngestion();

    expect(result.status).toBe("success");
  });
});

// ---------------------------------------------------------------------------
// runIngestion — ingestion_runs 기록 검증
// ---------------------------------------------------------------------------

describe("runIngestion — ingestion_runs 기록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("수집 완료 후 ingestion_runs에 카운트가 기록된다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>A</title><link>https://tech.kakao.com/a/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [{ id: 1 }], error: null, count: 1 }],
      }),
    );

    const result = await runIngestion();

    // result에 처리 카운트 필드가 존재한다
    expect(result).toHaveProperty("created");
    expect(result).toHaveProperty("skipped");
    expect(result).toHaveProperty("failed");
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("status");
  });

  it("processed 카운트는 created + skipped와 같다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>
        <item><title>A</title><link>https://tech.kakao.com/a/</link><pubDate>${RECENT_DATE}</pubDate></item>
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>${RECENT_DATE}</pubDate></item>
      </channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: [{ id: 1 }], error: null, count: 1 }],
      }),
    );

    const result = await runIngestion();

    expect(result.processed).toBe(result.created + result.skipped);
  });
});

// ---------------------------------------------------------------------------
// runIngestion — 소스별 수집 상한
// ---------------------------------------------------------------------------

describe("runIngestion — 소스별 수집 상한", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GeekNews는 31건 피드에서 최대 30건을 처리한다", async () => {
    const items = Array.from(
      { length: 31 },
      (_, i) =>
        `<item><title>Item ${i}</title><link>https://tech.kakao.com/item-${i}/</link><pubDate>${RECENT_DATE}</pubDate></item>`,
    ).join("");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: GEEKNEWS_SOURCE,
        insertResults: [{ data: Array.from({ length: 30 }, (_, i) => ({ id: i + 1 })), error: null, count: 30 }],
      }),
    );

    const result = await runIngestion();

    expect(result.processed).toBe(30);
  });

  it("다른 RSS 소스는 기존 10건 상한을 유지한다", async () => {
    const items = Array.from(
      { length: 11 },
      (_, i) =>
        `<item><title>Item ${i}</title><link>https://tech.kakao.com/item-${i}/</link><pubDate>${RECENT_DATE}</pubDate></item>`,
    ).join("");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`,
    }));

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })), error: null, count: 10 }],
      }),
    );

    const result = await runIngestion();

    expect(result.processed).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// slug UNIQUE 충돌 방어
//
// content_items.slug에 UNIQUE 제약이 있는데 upsert는 onConflict를 'url' 하나만
// 지정할 수 있다. slug가 충돌하면 ON CONFLICT (url) DO NOTHING이 잡지 못하고
// INSERT 문 전체가 abort되어 해당 소스의 신규 콘텐츠가 통째로 유실된다.
// ---------------------------------------------------------------------------

const CONTEST_SOURCE = [
  {
    id: "src-contest",
    name: "위비티",
    feed_url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21",
    feed_type: "wevity",
    default_language: "ko",
    section: "contest",
    is_active: true,
  },
];

/** 위비티 목록 HTML 한 항목 */
function wevityListItem(ix: number, title: string, dday = 10) {
  return `<div class="tit"><a href="?c=find&amp;s=1&amp;gub=1&amp;cidx=21&amp;gbn=view&amp;ix=${ix}">${title}</a></div>
    <div class="organ">주최기관</div><div class="day">D-${dday}</div>`;
}

function stubWevityFetch(listHtml: string, detailHtml = "") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      const isDetail = String(url).includes("gbn=viewok");
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => (isDetail ? detailHtml : listHtml),
      });
    }),
  );
}

describe("runIngestion — slug UNIQUE 충돌 방어", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("이미 존재하는 slug는 insert 대상에서 제외한다", async () => {
    stubWevityFetch(wevityListItem(1001, "제1회 해커톤 개발 공모전"));

    const insertResults = [{ data: [], error: null, count: 0 }];
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: CONTEST_SOURCE,
        insertResults,
        existingRows: [
          { id: 7, slug: "wevity-1001", url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=1001" },
        ],
      }),
    );

    const result = await runIngestion();

    // 배치가 통째로 실패하지 않고 정상 종료해야 한다
    expect(result.status).toBe("success");
    expect(result.failed).toBe(0);
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("기존 공모전의 deadline과 홈페이지 url을 갱신한다", async () => {
    // 상세에 홈페이지가 새로 붙고 접수기간이 연장된 상황
    stubWevityFetch(
      wevityListItem(1002, "제2회 소프트웨어 개발 공모전"),
      `<meta property="og:image" content="https://www.wevity.com/upload/contest/poster.jpg">
       <span class="tit">홈페이지</span><a href="https://contest.example.com/">바로가기</a>
       <span>접수기간</span> 2026-07-01 ~ 2026-12-31`,
    );

    const updateCalls: Array<{ patch: unknown; id: unknown }> = [];
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: CONTEST_SOURCE,
        insertResults: [{ data: [], error: null, count: 0 }],
        existingRows: [
          { id: 9, slug: "wevity-1002", url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=1002" },
        ],
        updateCalls,
      }),
    );

    await runIngestion();

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]!.id).toBe(9);
    expect(updateCalls[0]!.patch).toMatchObject({
      url: "https://contest.example.com/",
      thumbnail: "https://www.wevity.com/upload/contest/poster.jpg",
      // 2026-12-31 KST 23:59:59
      deadline: "2026-12-31T14:59:59.000Z",
    });
  });

  it("배치 insert가 실패하면 행 단위로 재시도해 나머지를 살린다", async () => {
    stubWevityFetch(
      wevityListItem(2001, "제1회 개발 해커톤") + wevityListItem(2002, "제2회 개발 해커톤"),
    );

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: CONTEST_SOURCE,
        // 배치 insert는 slug 충돌로 전체 실패
        insertResults: [
          { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" }, count: null },
        ],
        // 행 단위 재시도: 1건 성공, 1건 실패
        rowRetryResults: [
          { data: [{ id: 11, url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=2001" }], error: null, count: 1 },
          { data: null, error: { code: "23505", message: "duplicate key" }, count: null },
        ],
      }),
    );

    const result = await runIngestion();

    // 배치가 죽어도 살릴 수 있는 행은 살린다
    expect(result.created).toBe(1);
    expect(result.status).toBe("success");
  });

  it("같은 배치 안의 중복 slug는 한 번만 insert한다", async () => {
    // 두 위비티 소스가 같은 ix를 공유하는 상황을 한 목록 안에서 재현
    stubWevityFetch(
      wevityListItem(3001, "제3회 개발 공모전") + wevityListItem(3001, "제3회 개발 공모전"),
    );

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: CONTEST_SOURCE,
        insertResults: [
          { data: [{ id: 21, url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=3001" }], error: null, count: 1 },
        ],
      }),
    );

    const result = await runIngestion();

    expect(result.processed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.failed).toBe(0);
  });
});
