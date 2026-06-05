"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, Eye, ThumbsUp, X } from "lucide-react";
import { ContentCard } from "./content-card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadMoreFeed } from "@/features/feed/server/actions";
import type { FeedItem } from "@/features/feed/server/service";
import { cn } from "@/lib/utils";

type Filters = {
  q?: string;
  category?: string;
  type?: string;
  lang?: string;
  section?: string;
};

type Props = {
  initialItems: FeedItem[];
  nextCursor: string | null;
  filters: Filters;
  view?: "list" | "grid";
};

export function FeedInfiniteScroll({
  initialItems,
  nextCursor,
  filters,
  view = "list",
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
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, isLoading]);

  async function handleLoadMore() {
    if (!cursor) return;
    setIsLoading(true);
    try {
      const result = await loadMoreFeed({ cursor, ...filters });
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
            : "space-y-3",
        )}
      >
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            variant={view}
            onPreview={setPreviewItem}
          />
        ))}
      </div>
      {isLoading && (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              : "space-y-3",
          )}
        >
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          {view === "grid" && <Skeleton className="h-32 w-full" />}
        </div>
      )}
      {cursor && <div ref={sentinelRef} className="h-1" data-testid="load-more-sentinel" />}
      {previewItem && (
        <ContentPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
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
  onClose,
}: {
  item: FeedItem;
  onClose: () => void;
}) {
  const typeLabel = item.type === "article" ? "아티클" : "영상";

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
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt=""
              className="aspect-[16/9] max-h-[36vh] w-full object-cover"
            />
          ) : (
            <div className="aspect-[16/9] max-h-[36vh] w-full bg-neutral-800" />
          )}
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
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-teal-50 px-2 py-1 font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
              {typeLabel}
            </span>
            {item.categories[0] && (
              <span className="rounded-md border border-neutral-200 px-2 py-1 font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                {item.categories[0].name}
              </span>
            )}
            {item.source && (
              <span className="text-neutral-500">{item.source}</span>
            )}
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
              <Eye className="size-3" aria-hidden="true" />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="size-3" aria-hidden="true" />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <Bookmark className="size-3" aria-hidden="true" />
              0
            </span>
          </div>

          {item.tags.length > 0 && (
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
                aria-disabled="true"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <ThumbsUp className="size-4" aria-hidden="true" />
                추천
              </button>
              <button
                type="button"
                aria-disabled="true"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <Bookmark className="size-4" aria-hidden="true" />
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
    </div>
  );
}
