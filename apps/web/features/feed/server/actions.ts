"use server";

import { getFeed } from "./service";
import type { FeedItem } from "./service";

export async function loadMoreFeed(input: {
  cursor: string;
  q?: string;
  category?: string;
  type?: string;
  lang?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  return getFeed(
    {
      q: input.q,
      category: input.category,
      type: input.type as any,
      lang: input.lang,
    },
    input.cursor,
  );
}
