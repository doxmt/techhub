import { createClient } from "../../../lib/supabase/server";
import { encodeCursor, decodeCursor } from "../../../lib/cursor";
import { parseSlugId } from "../../../lib/slug";
import type { ContentType, FeedSection } from "@techhub/shared";

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  source: string | null;
  type: ContentType;
  language: string;
  slug: string;
  publishedAt: string;
  categories: { name: string; slug: string }[];
  tags: { name: string }[];
  isBookmarked?: boolean;
  isLiked?: boolean;
};

export type FeedFilters = {
  q?: string;
  categories?: string[];
  source?: string;
  type?: ContentType;
  lang?: string;
  section?: FeedSection;
};

const PAGE_SIZE = 20;

type ContentRow = {
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

function dedupeCategories(
  categories: { name: string; slug: string }[],
): { name: string; slug: string }[] {
  const seen = new Set<string>();
  return categories.filter((category) => {
    if (seen.has(category.slug)) return false;
    seen.add(category.slug);
    return true;
  });
}

function mapToFeedItem(row: ContentRow): FeedItem {
  return {
    id: String(row.id),
    url: row.url,
    title: row.title,
    description: row.description ?? null,
    thumbnailUrl: row.thumbnail ?? null,
    source: row.source ?? null,
    type: row.type as ContentType,
    language: row.language ?? "ko",
    slug: row.slug,
    publishedAt: row.published_at ?? "",
    categories: dedupeCategories(
      (row.content_categories ?? [])
        .map((cc) => cc.categories)
        .filter((c): c is { name: string; slug: string } => c !== null),
    ),
    tags: (row.content_tags ?? [])
      .map((ct) => ct.tags)
      .filter((t): t is { name: string } => t !== null),
  };
}

export async function getFeed(
  filters: FeedFilters,
  cursor?: string,
  userId?: string,
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const supabase = await createClient();
  const hasCategories = filters.categories && filters.categories.length > 0;
  const relationSelect = hasCategories
    ? `content_categories(categories(name, slug)),
      category_filter:content_categories!inner(categories!inner(slug)),
      content_tags(tags(name))`
    : `content_categories(categories(name, slug)),
      content_tags(tags(name))`;

  let query = supabase
    .from("content_items")
    .select(
      `id, title, description, thumbnail, source, type, language, slug, published_at,
      url,
      ${relationSelect}`,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query = query.or(
        `published_at.lt.${decoded.publishedAt},and(published_at.eq.${decoded.publishedAt},id.lt.${decoded.id})`,
      );
    }
  }

  if (filters.q && filters.q.trim().length > 0) {
    const sanitized = filters.q.trim();
    try {
      query = query.textSearch("search_vector", sanitized, {
        type: "websearch",
        config: "simple",
      });
    } catch {
      // FTS 쿼리 파싱 오류 시 무시
    }
  }

  if (filters.section === "article") {
    query = query.eq("type", "article");
  } else if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.lang) {
    query = query.eq("language", filters.lang);
  }

  if (filters.categories && filters.categories.length > 0) {
    query = query.in("category_filter.categories.slug", filters.categories);
  }

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  const { data, error } = await query;
  if (error || !data) return { items: [], nextCursor: null };

  const hasMore = data.length > PAGE_SIZE;
  const rows = hasMore ? data.slice(0, PAGE_SIZE) : data;

  const items = (rows as unknown as ContentRow[]).map(mapToFeedItem);
  const nextCursor = hasMore
    ? encodeCursor({
        publishedAt: (rows[rows.length - 1] as unknown as ContentRow).published_at!,
        id: rows[rows.length - 1].id,
      })
    : null;

  if (userId && items.length > 0) {
    const ids = items.map((item) => parseInt(item.id));
    const [{ data: bookmarks }, { data: likes }] = await Promise.all([
      supabase.from("bookmarks").select("content_id").eq("user_id", userId).in("content_id", ids),
      supabase.from("likes").select("content_id").eq("user_id", userId).in("content_id", ids),
    ]);
    const bookmarkedSet = new Set((bookmarks ?? []).map((b) => String(b.content_id)));
    const likedSet = new Set((likes ?? []).map((l) => String(l.content_id)));
    return {
      items: items.map((item) => ({
        ...item,
        isBookmarked: bookmarkedSet.has(item.id),
        isLiked: likedSet.has(item.id),
      })),
      nextCursor,
    };
  }

  return { items, nextCursor };
}

export async function getContentBySlugId(
  slugId: string,
): Promise<FeedItem | null> {
  const parsed = parseSlugId(slugId);
  if (!parsed) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_items")
    .select(
      `id, title, description, thumbnail, source, type, language, slug, status, published_at,
      url,
      content_categories(categories(name, slug)),
      content_tags(tags(name))`,
    )
    .eq("id", parsed.id)
    .single();

  if (!data || data.status !== "published") return null;
  return mapToFeedItem(data as unknown as ContentRow);
}
