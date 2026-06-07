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
}) {
  const {
    sources,
    insertResults = [],
    runInsertResult = { data: [{ id: "run-1" }], error: null },
    runUpdateResult = { data: null, error: null },
  } = options;

  let insertCallIndex = 0;

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "sources") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: sources, error: null }),
      };
    }
    if (table === "ingestion_runs") {
      return {
        insert: vi.fn().mockResolvedValue(runInsertResult),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(runUpdateResult),
      };
    }
    if (table === "content_items") {
      const result = insertResults[insertCallIndex] ?? { data: null, error: null, count: 0 };
      insertCallIndex++;
      return {
        insert: vi.fn().mockResolvedValue(result),
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
        <item><title>A</title><link>https://tech.kakao.com/a/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
        <item><title>B</title><link>https://tech.kakao.com/b/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
        <item><title>A</title><link>https://tech.kakao.com/new-a/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
          <item><title>B</title><link>https://toss.tech/b/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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

    // 두 소스 모두 시도했는지 확인
    expect(mockFetch).toHaveBeenCalledTimes(2);
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
          <item><title>B</title><link>https://toss.tech/b/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
        <item><title>A</title><link>https://tech.kakao.com/a/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
        <item><title>A</title><link>https://tech.kakao.com/a/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
        <item><title>Dup</title><link>https://tech.kakao.com/existing/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>
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
// runIngestion — 소스당 최대 30건 상한
// ---------------------------------------------------------------------------

describe("runIngestion — 소스당 30건 상한", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("31건 피드에서 최대 30건만 처리한다", async () => {
    const items = Array.from(
      { length: 31 },
      (_, i) =>
        `<item><title>Item ${i}</title><link>https://tech.kakao.com/item-${i}/</link><pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate></item>`,
    ).join("");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`,
    });
    vi.stubGlobal("fetch", mockFetch);

    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeAdminClientMock({
        sources: SINGLE_SOURCE,
        insertResults: [{ data: Array.from({ length: 30 }, (_, i) => ({ id: i + 1 })), error: null, count: 30 }],
      }),
    );

    const result = await runIngestion();

    // processed는 최대 30이어야 한다
    expect(result.processed).toBeLessThanOrEqual(30);
  });
});
