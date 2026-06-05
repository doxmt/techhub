/**
 * feed-infinite-scroll.test.tsx
 *
 * TDD: 이 테스트 파일은 아직 존재하지 않는 컴포넌트를 대상으로 작성됐다.
 * apps/web/components/feed/feed-infinite-scroll.tsx 가 없으므로 모든 테스트가
 * "Cannot find module" 오류로 실패해야 한다.
 *
 * 컴포넌트 구현 후 이 테스트가 통과해야 단계 4가 완료된다.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { FeedItem } from "../../features/feed/server/service";

import { FeedInfiniteScroll } from "../../components/feed/feed-infinite-scroll";

// loadMoreFeed Server Action mock
vi.mock("../../features/feed/server/actions", () => ({
  loadMoreFeed: vi.fn(),
}));

// Next.js navigation hooks mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { loadMoreFeed } from "../../features/feed/server/actions";

const makeItem = (id: string, title: string): FeedItem => ({
  id,
  url: `https://example.com/${id}`,
  title,
  description: `${title} 설명`,
  thumbnailUrl: null,
  source: "example.com",
  type: "article",
  language: "ko",
  slug: `slug-${id}`,
  publishedAt: "2026-05-01T09:00:00+00:00",
  categories: [],
  tags: [],
});

const INITIAL_ITEMS: FeedItem[] = [
  makeItem("1", "첫 번째 콘텐츠"),
  makeItem("2", "두 번째 콘텐츠"),
];

const MORE_ITEMS: FeedItem[] = [
  makeItem("3", "세 번째 콘텐츠"),
  makeItem("4", "네 번째 콘텐츠"),
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeedInfiniteScroll", () => {
  it("초기 items를 렌더한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor={null}
        filters={{}}
      />,
    );
    expect(screen.getByText("첫 번째 콘텐츠")).toBeInTheDocument();
    expect(screen.getByText("두 번째 콘텐츠")).toBeInTheDocument();
  });

  it("grid view에서는 4열 그리드 클래스를 사용한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor={null}
        filters={{}}
        view="grid"
      />,
    );

    expect(screen.getByTestId("feed-items")).toHaveClass("lg:grid-cols-4");
  });

  it("nextCursor가 null이면 더 보기 트리거를 표시하지 않는다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor={null}
        filters={{}}
      />,
    );
    expect(screen.queryByRole("button", { name: /더 보기|load more/i })).not.toBeInTheDocument();
  });

  it("nextCursor가 있으면 더 보기 트리거를 표시한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor="cursor-abc"
        filters={{}}
      />,
    );
    expect(screen.getByRole("button", { name: /더 보기|load more/i })).toBeInTheDocument();
  });

  it("더 보기 실행 시 loadMoreFeed를 호출한다", async () => {
    (loadMoreFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: MORE_ITEMS,
      nextCursor: null,
    });

    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor="cursor-abc"
        filters={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /더 보기|load more/i }));

    await waitFor(() => {
      expect(loadMoreFeed).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "cursor-abc" }),
      );
    });
  });

  it("section 필터를 더 보기 요청에 전달한다", async () => {
    (loadMoreFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: MORE_ITEMS,
      nextCursor: null,
    });

    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor="cursor-abc"
        filters={{ section: "article" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /더 보기|load more/i }));

    await waitFor(() => {
      expect(loadMoreFeed).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "cursor-abc", section: "article" }),
      );
    });
  });

  it("더 보기 실행 시 기존 아이템에 새 아이템이 추가된다", async () => {
    (loadMoreFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: MORE_ITEMS,
      nextCursor: null,
    });

    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor="cursor-abc"
        filters={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /더 보기|load more/i }));

    await waitFor(() => {
      expect(screen.getByText("첫 번째 콘텐츠")).toBeInTheDocument();
      expect(screen.getByText("두 번째 콘텐츠")).toBeInTheDocument();
      expect(screen.getByText("세 번째 콘텐츠")).toBeInTheDocument();
      expect(screen.getByText("네 번째 콘텐츠")).toBeInTheDocument();
    });
  });

  it("필터 props가 변경되면 cursor가 리셋되고 initialItems만 표시된다", async () => {
    (loadMoreFeed as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: MORE_ITEMS,
      nextCursor: null,
    });

    const { rerender } = render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor="cursor-abc"
        filters={{ category: "fe" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /더 보기|load more/i }));

    await waitFor(() => {
      expect(screen.getByText("세 번째 콘텐츠")).toBeInTheDocument();
    });

    // 새 필터로 새 initialItems가 props로 전달된다 (부모 Server Component가 re-fetch한 결과).
    const newInitialItems: FeedItem[] = [makeItem("10", "필터 후 첫 콘텐츠")];

    rerender(
      <FeedInfiniteScroll
        initialItems={newInitialItems}
        nextCursor={null}
        filters={{ category: "be" }}
      />,
    );

    // 이전에 로드된 MORE_ITEMS는 사라지고 새 initialItems만 남아야 한다.
    expect(screen.getByText("필터 후 첫 콘텐츠")).toBeInTheDocument();
    expect(screen.queryByText("세 번째 콘텐츠")).not.toBeInTheDocument();
    expect(screen.queryByText("더 보기")).not.toBeInTheDocument();
  });
});
