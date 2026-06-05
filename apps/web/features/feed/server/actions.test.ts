import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./service", () => ({
  getFeed: vi.fn(),
}));

import { loadMoreFeed } from "./actions";
import { getFeed } from "./service";

beforeEach(() => {
  vi.clearAllMocks();
  (getFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
    items: [],
    nextCursor: null,
  });
});

describe("loadMoreFeed", () => {
  it("forwards valid type filters", async () => {
    await loadMoreFeed({ cursor: "cursor-1", type: "article" });

    expect(getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ type: "article" }),
      "cursor-1",
    );
  });

  it("ignores invalid type filters", async () => {
    await loadMoreFeed({ cursor: "cursor-1", type: "invalid" });

    expect(getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
      "cursor-1",
    );
  });
});
