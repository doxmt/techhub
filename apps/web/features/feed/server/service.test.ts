import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFeed } from "./service";
import { createClient } from "../../../lib/supabase/server";

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const terminal = Promise.resolve(result);
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return terminal.then.bind(terminal);
      return () => new Proxy({}, handler);
    },
  };

  return new Proxy({}, handler);
}

function makeInspectableQueryBuilder(result: { data: unknown; error: unknown }) {
  const calls: Array<[string, unknown[]]> = [];
  const terminal = Promise.resolve(result);
  const builder = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return terminal.then.bind(terminal);
        if (prop === "calls") return calls;
        return (...args: unknown[]) => {
          calls.push([String(prop), args]);
          return builder;
        };
      },
    },
  );
  return builder as { calls: Array<[string, unknown[]]> };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFeed", () => {
  it("handles nullable relation arrays from Supabase", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: () =>
        makeQueryBuilder({
          data: [
            {
              id: 1,
              url: "https://example.com/nullable-relations",
              title: "Nullable relations",
              description: null,
              thumbnail: null,
              source: null,
              type: "article",
              language: null,
              slug: "nullable-relations",
              published_at: null,
              content_categories: null,
              content_tags: null,
            },
          ],
          error: null,
        }),
    });

    const result = await getFeed({});

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        categories: [],
        tags: [],
        publishedAt: "",
      }),
    );
  });

  it("section 필터를 content_items.section 조건으로 적용한다", async () => {
    const builder = makeInspectableQueryBuilder({ data: [], error: null });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: () => builder,
    });

    await getFeed({ section: "news" });

    expect(builder.calls).toContainEqual(["eq", ["section", "news"]]);
    expect(builder.calls).not.toContainEqual(["eq", ["type", "article"]]);
  });
  describe("section=event", () => {
    function setup(data: unknown[] = []) {
      const builder = makeInspectableQueryBuilder({ data, error: null });
      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        from: () => builder,
      });
      return builder;
    }

    it("event 섹션이고 종료되지 않은 행사만 조회한다", async () => {
      const builder = setup();

      await getFeed({ section: "event" });

      expect(builder.calls).toContainEqual(["eq", ["section", "event"]]);
      const gte = builder.calls.find(([m, a]) => m === "gte" && a[0] === "deadline");
      expect(gte).toBeDefined();
      expect(Number.isNaN(Date.parse(gte![1][1] as string))).toBe(false);
    });

    it("정렬 옵션과 무관하게 시작일 오름차순으로 정렬한다", async () => {
      const builder = setup();

      await getFeed({ section: "event", sort: "views" });

      expect(builder.calls).toContainEqual(["order", ["published_at", { ascending: true }]]);
      expect(builder.calls).toContainEqual(["order", ["id", { ascending: true }]]);
      expect(builder.calls.some(([m, a]) => m === "order" && a[0] === "view_count")).toBe(false);
    });

    it("기간 필터를 무시한다", async () => {
      const builder = setup();

      await getFeed({ section: "event", period: "day" });

      expect(builder.calls.some(([m, a]) => m === "gte" && a[0] === "published_at")).toBe(false);
    });

    it("커서는 published_at 오름차순 기준으로 이어진다", async () => {
      const builder = setup();
      const { encodeCursor } = await import("../../../lib/cursor");

      await getFeed(
        { section: "event" },
        encodeCursor({ publishedAt: "2026-12-01T00:00:00.000Z", id: 7 }),
      );

      expect(builder.calls).toContainEqual([
        "or",
        [
          "published_at.gt.2026-12-01T00:00:00.000Z,and(published_at.eq.2026-12-01T00:00:00.000Z,id.gt.7)",
        ],
      ]);
    });

    it("행사 row의 section을 event로 매핑한다", async () => {
      setup([
        {
          id: 1,
          url: "https://www.coex.co.kr/exhibitions/x/",
          title: "컴업 2026",
          description: "코엑스 Hall C",
          thumbnail: null,
          source: "코엑스",
          type: "article",
          section: "event",
          language: "ko",
          slug: "coex-x",
          published_at: "2026-12-08T15:00:00.000Z",
          deadline: "2026-12-11T14:59:59.999Z",
          content_categories: [],
          content_tags: [],
        },
      ]);

      const result = await getFeed({ section: "event" });

      expect(result.items[0]).toEqual(
        expect.objectContaining({ section: "event", deadline: "2026-12-11T14:59:59.999Z" }),
      );
    });
  });
});
