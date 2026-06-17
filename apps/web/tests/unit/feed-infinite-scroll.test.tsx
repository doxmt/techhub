import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { FeedItem } from "../../features/feed/server/service";

import { FeedInfiniteScroll } from "../../components/feed/feed-infinite-scroll";

vi.mock("../../features/feed/server/actions", () => ({
  loadMoreFeed: vi.fn(),
  incrementViewCount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { loadMoreFeed } from "../../features/feed/server/actions";

let intersectionCallback: IntersectionObserverCallback | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  intersectionCallback = null;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        intersectionCallback = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

function triggerIntersect() {
  act(() => {
    intersectionCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

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
    expect(screen.queryByTestId("load-more-sentinel")).not.toBeInTheDocument();
  });

  it("nextCursor가 있으면 더 보기 트리거를 표시한다", () => {
    render(
      <FeedInfiniteScroll
        initialItems={INITIAL_ITEMS}
        nextCursor="cursor-abc"
        filters={{}}
      />,
    );
    expect(screen.getByTestId("load-more-sentinel")).toBeInTheDocument();
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

    triggerIntersect();

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

    triggerIntersect();

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

    triggerIntersect();

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

    triggerIntersect();

    await waitFor(() => {
      expect(screen.getByText("세 번째 콘텐츠")).toBeInTheDocument();
    });

    const newInitialItems: FeedItem[] = [makeItem("10", "필터 후 첫 콘텐츠")];

    rerender(
      <FeedInfiniteScroll
        initialItems={newInitialItems}
        nextCursor={null}
        filters={{ category: "be" }}
      />,
    );

    expect(screen.getByText("필터 후 첫 콘텐츠")).toBeInTheDocument();
    expect(screen.queryByText("세 번째 콘텐츠")).not.toBeInTheDocument();
    expect(screen.queryByTestId("load-more-sentinel")).not.toBeInTheDocument();
  });
});
