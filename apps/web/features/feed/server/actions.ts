"use server";

import { getFeed } from "./service";
import type { FeedItem, FeedFilters } from "./service";
import type { ContentType, FeedSection } from "@techhub/shared";
import { CONTENT_TYPES, FEED_SECTIONS, CATEGORY_SLUGS, SOURCES } from "@techhub/shared";
import { createClient } from "../../../lib/supabase/server";

export async function loadMoreFeed(input: {
  cursor: string;
  q?: string;
  categories?: string;  // 쉼표 구분 문자열
  source?: string;
  type?: string;
  lang?: string;
  section?: string;
  sort?: string;
  period?: string;
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

  const categories =
    typeof input.categories === "string" && input.categories.length > 0
      ? input.categories
          .split(",")
          .map((s) => s.trim())
          .filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s))
          .slice(0, 3)
      : undefined;

  const source =
    typeof input.source === "string" &&
    (SOURCES as readonly string[]).includes(input.source)
      ? input.source
      : undefined;

  const sort =
    input.sort === "oldest" || input.sort === "views" || input.sort === "recommended"
      ? (input.sort as "oldest" | "views" | "recommended")
      : "latest";
  const period =
    input.period === "day" || input.period === "week" || input.period === "month"
      ? (input.period as "day" | "week" | "month")
      : "all";

  const filters: FeedFilters = {
    q: input.q,
    categories,
    source,
    type,
    lang: input.lang,
    section,
    sort,
    period,
  };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  return getFeed(filters, input.cursor, userId);
}

export async function incrementViewCount(contentId: number): Promise<void> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)("increment_view_count", { p_content_id: contentId });
}
