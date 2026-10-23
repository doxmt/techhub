"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUpRight, Bookmark, Eye, ThumbsUp, X } from "lucide-react";
import { CONTEST_TYPES } from "@techhub/shared";
import { formatDday } from "@/lib/dday";
import { ContentCard } from "./content-card";
import { ThumbnailImage } from "./thumbnail-image";
import { Skeleton } from "@/components/ui/skeleton";
import { loadMoreFeed, incrementViewCount } from "@/features/feed/server/actions";
import { toggleBookmark, toggleLike } from "@/features/auth/server/actions";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import type { FeedItem } from "@/features/feed/server/service";
import { cn } from "@/lib/utils";

type Filters = {
  q?: string;
  categories?: string[];
  source?: string;
  type?: string;
  lang?: string;
  section?: string;
  saved?: string;
  sort?: string;
  period?: string;
  cstatus?: string;
  ctype?: string;
};

type Props = {
  initialItems: FeedItem[];
  nextCursor: string | null;
  filters: Filters;
  view?: "list" | "grid";
  isLoggedIn?: boolean;
};

export function FeedInfiniteScroll({
  initialItems,
  nextCursor,
  filters,
  view = "list",
  isLoggedIn = false,
}: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<FeedItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setCursor(nextCursor);
    setPreviewItem(null);
  }, [initialItems]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor || isLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handleLoadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, isLoading]);

  function handlePreview(item: FeedItem) {
    setPreviewItem({ ...item, viewCount: item.viewCount + 1 });
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, viewCount: i.viewCount + 1 } : i
      )
    );
    void incrementViewCount(Number(item.id));
  }

  async function handleLoadMore() {
    if (!cursor) return;
    setIsLoading(true);
    try {
      const result = await loadMoreFeed({
        cursor,
        ...filters,
        categories: filters.categories?.join(","),
      });
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setIsLoading(false);
    }
  }

  if (items.length === 0 && !isLoading) {
    return (
      <p className="py-12 text-center text-sm text-neutral-500">
        콘텐츠가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        data-testid="feed-items"
        className={cn(
          view === "grid"
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            : "space-y-3"
        )}
      >
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            variant={view}
            onPreview={handlePreview}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>
      {isLoading && (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              : "space-y-3"
          )}
        >
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          {view === "grid" && <Skeleton className="h-32 w-full" />}
        </div>
      )}
      {cursor && (
        <div
          ref={sentinelRef}
          className="h-1"
          data-testid="load-more-sentinel"
        />
      )}
      {previewItem && (
        <ContentPreviewModal
          item={previewItem}
          isLoggedIn={isLoggedIn}
          onClose={() => setPreviewItem(null)}
          onLikesCountChange={(contentId, delta) => {
            setItems((prev) =>
              prev.map((i) =>
                Number(i.id) === contentId
                  ? { ...i, likesCount: Math.max(0, i.likesCount + delta) }
                  : i
              )
            );
          }}
        />
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function ContentPreviewModal({
  item,
  isLoggedIn,
  onClose,
  onLikesCountChange,
}: {
  item: FeedItem;
  isLoggedIn: boolean;
  onClose: () => void;
  onLikesCountChange?: (contentId: number, delta: number) => void;
}) {
  const [bookmarked, setBookmarked] = useState(item.isBookmarked ?? false);
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(item.likesCount);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [, startTransition] = useTransition();
  const isContest = item.section === "contest";
  const typeLabel = isContest
    ? (CONTEST_TYPES.find((c) => c.slug === item.contestType)?.name ?? "공모전")
    : item.section === "news"
      ? "뉴스"
      : item.type === "article"
        ? "아티클"
        : "영상";
  const showTopicBadges = item.section !== "news" && !isContest;
  const dday = isContest ? formatDday(item.deadline) : null;

  function handleBookmarkClick() {
    if (!isLoggedIn) {
      setAuthDialogOpen(true);
      return;
    }
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const result = await toggleBookmark(Number(item.id));
      if ("error" in result) setBookmarked(!next);
    });
  }

  function handleLikeClick() {
    if (!isLoggedIn) {
      setAuthDialogOpen(true);
      return;
    }
    const next = !liked;
    const delta = next ? 1 : -1;
    setLiked(next);
    setLikesCount((prev) => Math.max(0, prev + delta));
    onLikesCountChange?.(Number(item.id), delta);
    startTransition(async () => {
      const result = await toggleLike(Number(item.id));
      if ("error" in result) {
        setLiked(!next);
        setLikesCount((prev) => Math.max(0, prev - delta));
        onLikesCountChange?.(Number(item.id), -delta);
      }
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-preview-title"
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-neutral-900">
          <div className="aspect-[16/9] max-h-[36vh] w-full">
            {item.thumbnailUrl ? (
              <ThumbnailImage
                src={item.thumbnailUrl}
                alt=""
                source={item.source ?? ""}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                <span className="text-sm font-semibold text-neutral-600">
                  {item.source}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg border border-white/15 bg-neutral-950/75 text-white shadow-sm backdrop-blur transition hover:bg-neutral-950/90"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">닫기</span>
          </button>
        </div>

        <div className="p-5">
          <div className="mb-3 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap text-xs">
            <span className="shrink-0 rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
              {typeLabel}
            </span>
            {dday && (
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 font-semibold",
                  dday.closed
                    ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                    : "bg-teal-600 text-white dark:bg-teal-500 dark:text-neutral-950",
                )}
              >
                {dday.label}
              </span>
            )}
            {item.source && (
              <span className="shrink-0 text-neutral-500">{item.source}</span>
            )}
            {showTopicBadges &&
              item.categories.map((category) => (
                <span
                  key={category.slug}
                  className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                >
                  {category.name}
                </span>
              ))}
          </div>

          <div className="flex items-start gap-3">
            <h2
              id="content-preview-title"
              className="line-clamp-2 min-w-0 flex-1 break-words text-xl font-semibold leading-tight text-neutral-950 dark:text-neutral-50"
            >
              {item.title}
            </h2>
          </div>

          {item.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              {item.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-neutral-500">
            <span>{formatDate(item.publishedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" aria-hidden="true" />{item.viewCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3" aria-hidden="true" />{likesCount}
            </span>
          </div>

          {showTopicBadges && item.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLikeClick}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
                  liked
                    ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-400"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                )}
              >
                <ThumbsUp
                  className={cn("size-4", liked && "fill-current")}
                  aria-hidden="true"
                />
                추천
              </button>
              <button
                type="button"
                onClick={handleBookmarkClick}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
                  bookmarked
                    ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                )}
              >
                <Bookmark
                  className={cn("size-4", bookmarked && "fill-current")}
                  aria-hidden="true"
                />
                북마크
              </button>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white transition hover:bg-teal-700 dark:bg-teal-500 dark:text-neutral-950 dark:hover:bg-teal-400"
            >
              원문 보기
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
}
