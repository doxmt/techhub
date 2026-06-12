import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FeedItem } from "@/features/feed/server/service";
import { FeedInfiniteScroll } from "./feed-infinite-scroll";

vi.mock("@/features/feed/server/actions", () => ({
  loadMoreFeed: vi.fn(),
  incrementViewCount: vi.fn().mockResolvedValue(undefined),
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
  categories: [
    { name: "Frontend", slug: "fe" },
    { name: "Performance", slug: "performance" },
  ],
  tags: [],
};

describe("FeedInfiniteScroll", () => {
  it("section 필터가 포함된 피드도 렌더한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={[item]}
        nextCursor={null}
        filters={{ section: "article" }}
      />
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
      />
    );

    expect(screen.getByTestId("feed-items")).toHaveClass("lg:grid-cols-4");
  });

  it("프리뷰에서 연결된 카테고리를 모두 보여준다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={[item]}
        nextCursor={null}
        filters={{}}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /섹션 테스트 콘텐츠/i })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("Frontend")).toHaveLength(2);
    expect(screen.getAllByText("Performance")).toHaveLength(2);
  });

  it("뉴스 프리뷰에서는 주제와 태그를 숨긴다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={[{
          ...item,
          section: "news",
          tags: [{ name: "React" }],
        }]}
        nextCursor={null}
        filters={{ section: "news" }}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /섹션 테스트 콘텐츠/i })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
    expect(screen.queryByText("Performance")).not.toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });
});
