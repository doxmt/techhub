"use server";

import { getFeed } from "./service";
import type { FeedItem, FeedFilters } from "./service";
import type { ContentType } from "@techhub/shared";
import { CONTENT_TYPES } from "@techhub/shared";

export async function loadMoreFeed(input: {
  cursor: string;
  q?: string;
  category?: string;
  type?: string;
  lang?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const type =
    input.type !== undefined &&
    (CONTENT_TYPES as readonly string[]).includes(input.type)
      ? (input.type as ContentType)
      : undefined;

  const filters: FeedFilters = {
    q: input.q,
    category: input.category,
    type,
    lang: input.lang,
  };

  return getFeed(filters, input.cursor);
}
