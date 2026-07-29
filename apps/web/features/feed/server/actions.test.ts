import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./service", () => ({
  getFeed: vi.fn(),
}));

vi.mock("../../auth/server/service", () => ({
  SAVED_SECTIONS: ["all", "news", "article", "contest"],
  getSavedFeed: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  }),
}));

import { loadMoreFeed } from "./actions";
import { getFeed } from "./service";
import { getSavedFeed } from "../../auth/server/service";
import { createClient } from "../../../lib/supabase/server";

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
      undefined,
    );
  });

  it("ignores invalid type filters", async () => {
    await loadMoreFeed({ cursor: "cursor-1", type: "invalid" });

    expect(getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
      "cursor-1",
      undefined,
    );
  });

  describe("saved 섹션", () => {
    function mockUser(user: { id: string } | null) {
      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
      });
    }

    it("비로그인 상태면 빈 결과를 반환한다", async () => {
      mockUser(null);
      const result = await loadMoreFeed({ cursor: "c1", section: "saved" });

      expect(result).toEqual({ items: [], nextCursor: null });
      expect(getSavedFeed).not.toHaveBeenCalled();
    });

    it("로그인 상태면 커서로 다음 북마크 페이지를 이어 받는다", async () => {
      mockUser({ id: "user-1" });
      (getSavedFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: "c2",
      });

      const result = await loadMoreFeed({
        cursor: "c1",
        section: "saved",
        saved: "contest",
      });

      expect(getSavedFeed).toHaveBeenCalledWith({
        userId: "user-1",
        cursor: "c1",
        section: "contest",
      });
      expect(result.nextCursor).toBe("c2");
    });

    it("알 수 없는 saved 값은 all로 폴백한다", async () => {
      mockUser({ id: "user-1" });
      (getSavedFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: null,
      });

      await loadMoreFeed({ cursor: "c1", section: "saved", saved: "bogus" });

      expect(getSavedFeed).toHaveBeenCalledWith(
        expect.objectContaining({ section: "all" }),
      );
    });

    it("recommended 섹션은 여전히 빈 결과를 반환한다", async () => {
      mockUser({ id: "user-1" });
      const result = await loadMoreFeed({ cursor: "c1", section: "recommended" });

      expect(result).toEqual({ items: [], nextCursor: null });
      expect(getFeed).not.toHaveBeenCalled();
    });
  });
});
