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
});
