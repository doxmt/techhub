import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookmarkTabs } from "./bookmark-tabs";
import type { FeedItem } from "@/features/feed/server/service";

vi.mock("@/components/feed/feed-infinite-scroll", () => ({
  FeedInfiniteScroll: ({
    initialItems,
    nextCursor,
    filters,
  }: {
    initialItems: FeedItem[];
    nextCursor: string | null;
    filters: Record<string, unknown>;
  }) => (
    <div
      data-testid="feed-infinite-scroll"
      data-count={initialItems.length}
      data-cursor={nextCursor ?? ""}
      data-filters={JSON.stringify(filters)}
    />
  ),
}));

function makeItem(overrides: Partial<FeedItem>): FeedItem {
  return {
    id: "1",
    url: "https://example.com",
    title: "테스트 콘텐츠",
    description: null,
    thumbnailUrl: null,
    source: null,
    type: "article",
    section: "article",
    language: "ko",
    slug: "test",
    publishedAt: "2024-01-01",
    viewCount: 0,
    likesCount: 0,
    categories: [],
    tags: [],
    isBookmarked: true,
    ...overrides,
  };
}

const counts = { all: 4, news: 1, article: 2, contest: 1, event: 0 };

describe("BookmarkTabs", () => {
  it("각 섹션 탭을 URL query 링크로 렌더링한다", () => {
    render(
      <BookmarkTabs
        items={[makeItem({})]}
        nextCursor={null}
        activeSection="all"
        counts={counts}
        isLoggedIn={false}
      />,
    );
    expect(screen.getByRole("link", { name: /전체/ })).toHaveAttribute(
      "href",
      "/?section=saved",
    );
    expect(screen.getByRole("link", { name: /최신뉴스/ })).toHaveAttribute(
      "href",
      "/?section=saved&saved=news",
    );
    expect(screen.getByRole("link", { name: /아티클/ })).toHaveAttribute(
      "href",
      "/?section=saved&saved=article",
    );
    expect(screen.getByRole("link", { name: /공모전/ })).toHaveAttribute(
      "href",
      "/?section=saved&saved=contest",
    );
    expect(screen.getByRole("link", { name: /행사/ })).toHaveAttribute(
      "href",
      "/?section=saved&saved=event",
    );
  });

  it("서버가 내려준 전체 개수 배지를 표시한다", () => {
    render(
      <BookmarkTabs
        items={[makeItem({})]}
        nextCursor={null}
        activeSection="all"
        counts={counts}
        isLoggedIn={false}
      />,
    );
    // 현재 페이지에 로드된 개수가 아니라 서버 집계 개수를 쓴다
    expect(screen.getByRole("link", { name: /전체/ })).toHaveTextContent("4");
    expect(screen.getByRole("link", { name: /아티클/ })).toHaveTextContent("2");
  });

  it("활성 탭에 aria-current를 표시한다", () => {
    render(
      <BookmarkTabs
        items={[makeItem({ section: "news" })]}
        nextCursor={null}
        activeSection="news"
        counts={counts}
        isLoggedIn={false}
      />,
    );
    expect(screen.getByRole("link", { name: /최신뉴스/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /전체/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("커서를 무한 스크롤에 그대로 전달해 200개 캡 없이 이어 받는다", () => {
    render(
      <BookmarkTabs
        items={[makeItem({})]}
        nextCursor="2026-06-05T10:00:00Z"
        activeSection="article"
        counts={counts}
        isLoggedIn={false}
      />,
    );
    const scroll = screen.getByTestId("feed-infinite-scroll");
    expect(scroll).toHaveAttribute("data-cursor", "2026-06-05T10:00:00Z");
    expect(JSON.parse(scroll.getAttribute("data-filters")!)).toMatchObject({
      section: "saved",
      saved: "article",
    });
  });

  it("아이템이 없을 때 빈 상태 메시지를 표시한다", () => {
    render(
      <BookmarkTabs
        items={[]}
        nextCursor={null}
        activeSection="all"
        counts={{ all: 0, news: 0, article: 0, contest: 0, event: 0 }}
        isLoggedIn={false}
      />,
    );
    expect(screen.getByText("아직 저장된 콘텐츠가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByTestId("feed-infinite-scroll")).not.toBeInTheDocument();
  });

  it("해당 섹션에 아이템이 없으면 섹션별 빈 메시지를 표시한다", () => {
    render(
      <BookmarkTabs
        items={[]}
        nextCursor={null}
        activeSection="news"
        counts={{ all: 3, news: 0, article: 3, contest: 0, event: 0 }}
        isLoggedIn={false}
      />,
    );
    expect(
      screen.getByText("저장된 최신뉴스 콘텐츠가 없습니다."),
    ).toBeInTheDocument();
  });
});
