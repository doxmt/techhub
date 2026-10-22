import { createClient } from "../../../lib/supabase/server";
import type { FeedItem } from "../../feed/server/service";

const PAGE_SIZE = 20;

type ContentItemRow = {
  id: number;
  url: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  source: string | null;
  type: string;
  section: string | null;
  language: string | null;
  slug: string;
  published_at: string | null;
  deadline: string | null;
  contest_type: string | null;
  status?: string;
  content_categories: { categories: { name: string; slug: string } | null }[] | null;
  content_tags: { tags: { name: string } | null }[] | null;
};

type BookmarkRow = {
  created_at: string;
  content_items: ContentItemRow | null;
};

function mapBookmarkRowToFeedItem(row: BookmarkRow): FeedItem | null {
  const ci = row.content_items;
  if (!ci) return null;
  return {
    id: String(ci.id),
    url: ci.url,
    title: ci.title,
    description: ci.description ?? null,
    thumbnailUrl: ci.thumbnail ?? null,
    source: ci.source ?? null,
    type: ci.type as FeedItem["type"],
    section: (ci.section ?? "article") as FeedItem["section"],
    language: ci.language ?? "ko",
    slug: ci.slug,
    publishedAt: ci.published_at ?? "",
    deadline: ci.deadline ?? null,
    contestType: ci.contest_type ?? null,
    viewCount: 0,
    likesCount: 0,
    categories: (ci.content_categories ?? [])
      .map((cc) => cc.categories)
      .filter((c): c is { name: string; slug: string } => c !== null),
    tags: (ci.content_tags ?? [])
      .map((ct) => ct.tags)
      .filter((t): t is { name: string } => t !== null),
    isBookmarked: true,
  };
}

export const SAVED_SECTIONS = ["all", "news", "article", "contest", "event"] as const;
export type SavedSection = (typeof SAVED_SECTIONS)[number];

export async function getSavedFeed({
  userId,
  cursor,
  section = "all",
}: {
  userId: string | null;
  cursor?: string;
  section?: SavedSection;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  if (!userId) {
    return { items: [], nextCursor: null };
  }

  const supabase = await createClient();

  // 섹션 필터를 DB에서 걸어야 하므로 inner join으로 조회한다
  let query = supabase
    .from("bookmarks")
    .select(
      `created_at,
      content_items!inner(
        id, url, title, description, thumbnail, source, type, section, language, slug, published_at, deadline, contest_type, status,
        content_categories(categories(name, slug)),
        content_tags(tags(name))
      )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (section !== "all") {
    query = query.eq("content_items.section", section);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { items: [], nextCursor: null };
  }

  const rows = data as unknown as BookmarkRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const items = pageRows
    .map(mapBookmarkRowToFeedItem)
    .filter((item): item is FeedItem => item !== null);

  const nextCursor = hasMore ? pageRows[pageRows.length - 1].created_at : null;

  return { items, nextCursor };
}

/**
 * 북마크 탭 배지에 쓰는 섹션별 총 개수. 페이지에 로드된 개수가 아니라 DB 집계다.
 */
export async function getSavedCounts(
  userId: string | null,
): Promise<Record<SavedSection, number>> {
  const empty = { all: 0, news: 0, article: 0, contest: 0, event: 0 };
  if (!userId) return empty;

  const supabase = await createClient();

  const countFor = async (section: SavedSection) => {
    let query = supabase
      .from("bookmarks")
      .select("content_items!inner(section)", { count: "exact", head: true })
      .eq("user_id", userId);
    if (section !== "all") {
      query = query.eq("content_items.section", section);
    }
    const { count, error } = await query;
    return error ? 0 : (count ?? 0);
  };

  const [all, news, article, contest, event] = await Promise.all(
    SAVED_SECTIONS.map(countFor),
  );

  return { all: all!, news: news!, article: article!, contest: contest!, event: event! };
}
