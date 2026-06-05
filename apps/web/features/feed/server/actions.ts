"use server";

import { getFeed } from "./service";
import type { FeedItem } from "./service";
import type { ContentType } from "@techhub/shared";

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
      type: input.type as ContentType | undefined,
      lang: input.lang,
    },
    input.cursor,
  );
}
