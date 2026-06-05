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
  language: string | null;
  slug: string;
  published_at: string | null;
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
    language: ci.language ?? "ko",
    slug: ci.slug,
    publishedAt: ci.published_at ?? "",
    categories: (ci.content_categories ?? [])
      .map((cc) => cc.categories)
      .filter((c): c is { name: string; slug: string } => c !== null),
    tags: (ci.content_tags ?? [])
      .map((ct) => ct.tags)
      .filter((t): t is { name: string } => t !== null),
    isBookmarked: true,
  };
}

export async function getSavedFeed({
  userId,
  cursor,
}: {
  userId: string | null;
  cursor?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  if (!userId) {
    return { items: [], nextCursor: null };
  }

  const supabase = await createClient();

  let query = supabase
    .from("bookmarks")
    .select(
      `created_at,
      content_items(
        id, url, title, description, thumbnail, source, type, language, slug, published_at, status,
        content_categories(categories(name, slug)),
        content_tags(tags(name))
      )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

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
