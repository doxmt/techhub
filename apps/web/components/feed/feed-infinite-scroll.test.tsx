import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FeedItem } from "@/features/feed/server/service";
import { FeedInfiniteScroll } from "./feed-infinite-scroll";

vi.mock("@/features/feed/server/actions", () => ({
  loadMoreFeed: vi.fn(),
}));

const item: FeedItem = {
  id: "1",
  url: "https://example.com/section-test-content",
  title: "섹션 테스트 콘텐츠",
  description: null,
  thumbnailUrl: null,
  source: "example.com",
  type: "article",
  language: "ko",
  slug: "section-test-content",
  publishedAt: "2026-06-05T00:00:00+00:00",
  categories: [],
  tags: [],
};

describe("FeedInfiniteScroll", () => {
  it("section 필터가 포함된 피드도 렌더한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={[item]}
        nextCursor={null}
        filters={{ section: "article" }}
      />,
    );

    expect(screen.getByText("섹션 테스트 콘텐츠")).toBeInTheDocument();
  });

  it("grid view를 렌더한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={[item]}
        nextCursor={null}
        filters={{}}
        view="grid"
      />,
    );

    expect(screen.getByTestId("feed-items")).toHaveClass("lg:grid-cols-4");
  });
});
