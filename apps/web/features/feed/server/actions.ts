"use server";

import { getFeed } from "./service";
import type { FeedItem, FeedFilters } from "./service";
import type { ContentType, FeedSection } from "@techhub/shared";
import { CONTENT_TYPES, FEED_SECTIONS } from "@techhub/shared";
import { createClient } from "../../../lib/supabase/server";

export async function loadMoreFeed(input: {
  cursor: string;
  q?: string;
  category?: string;
  type?: string;
  lang?: string;
  section?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const type =
    input.type !== undefined &&
    (CONTENT_TYPES as readonly string[]).includes(input.type)
      ? (input.type as ContentType)
      : undefined;
  const section =
    input.section !== undefined &&
    (FEED_SECTIONS as readonly string[]).includes(input.section)
      ? (input.section as FeedSection)
      : undefined;

  if (section === "contest" || section === "recommended" || section === "saved") {
    return { items: [], nextCursor: null };
  }

  const filters: FeedFilters = {
    q: input.q,
    category: input.category,
    type,
    lang: input.lang,
    section,
  };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  return getFeed(filters, input.cursor, userId);
}
