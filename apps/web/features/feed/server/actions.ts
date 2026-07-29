"use server";

import { getFeed } from "./service";
import type { FeedItem, FeedFilters } from "./service";
import type {
  ContentType,
  ContestStatus,
  ContestTypeSlug,
  FeedSection,
} from "@techhub/shared";
import {
  CONTENT_TYPES,
  CONTEST_STATUSES,
  CONTEST_TYPE_SLUGS,
  FEED_SECTIONS,
  CATEGORY_SLUGS,
  SOURCES,
} from "@techhub/shared";
import { createClient } from "../../../lib/supabase/server";
import { getSavedFeed, SAVED_SECTIONS } from "../../auth/server/service";
import type { SavedSection } from "../../auth/server/service";

export async function loadMoreFeed(input: {
  cursor: string;
  q?: string;
  categories?: string;  // 쉼표 구분 문자열
  source?: string;
  type?: string;
  lang?: string;
  section?: string;
  saved?: string;  // section='saved'일 때의 하위 탭
  sort?: string;
  period?: string;
  cstatus?: string;
  ctype?: string;
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

  if (section === "recommended") {
    return { items: [], nextCursor: null };
  }

  if (section === "saved") {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { items: [], nextCursor: null };

    const saved =
      input.saved !== undefined &&
      (SAVED_SECTIONS as readonly string[]).includes(input.saved)
        ? (input.saved as SavedSection)
        : "all";

    return getSavedFeed({ userId, cursor: input.cursor, section: saved });
  }

  const cstatus =
    input.cstatus !== undefined &&
    (CONTEST_STATUSES as readonly string[]).includes(input.cstatus)
      ? (input.cstatus as ContestStatus)
      : undefined;
  const ctype =
    input.ctype !== undefined &&
    (CONTEST_TYPE_SLUGS as readonly string[]).includes(input.ctype)
      ? (input.ctype as ContestTypeSlug)
      : undefined;

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
    cstatus,
    ctype,
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
