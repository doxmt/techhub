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
});
