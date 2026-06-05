"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "./content-card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadMoreFeed } from "@/features/feed/server/actions";
import type { FeedItem } from "@/features/feed/server/service";

type Filters = {
  q?: string;
  category?: string;
  type?: string;
  lang?: string;
};

type Props = {
  initialItems: FeedItem[];
  nextCursor: string | null;
  filters: Filters;
};

export function FeedInfiniteScroll({ initialItems, nextCursor, filters }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setCursor(nextCursor);
  }, [initialItems]);

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
      {items.map((item) => (
        <ContentCard key={item.id} item={item} />
      ))}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {cursor && !isLoading && (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleLoadMore}
            className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
