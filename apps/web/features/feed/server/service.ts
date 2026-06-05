import { createClient } from "../../../lib/supabase/server";
import { encodeCursor, decodeCursor } from "../../../lib/cursor";
import { parseSlugId } from "../../../lib/slug";
import type { ContentType } from "@techhub/shared";

export type FeedItem = {
  id: string;
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
};

export type FeedFilters = {
  q?: string;
  category?: string;
  type?: ContentType;
  lang?: string;
};

const PAGE_SIZE = 20;

type ContentRow = {
  id: number;
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

function mapToFeedItem(row: ContentRow): FeedItem {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description ?? null,
    thumbnailUrl: row.thumbnail ?? null,
    source: row.source ?? null,
    type: row.type as ContentType,
    language: row.language ?? "ko",
    slug: row.slug,
    publishedAt: row.published_at!,
    categories: (row.content_categories ?? [])
      .map((cc) => cc.categories)
      .filter((c): c is { name: string; slug: string } => c !== null),
    tags: (row.content_tags ?? [])
      .map((ct) => ct.tags)
      .filter((t): t is { name: string } => t !== null),
  };
}

export async function getFeed(
  filters: FeedFilters,
  cursor?: string,
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from("content_items")
    .select(
      `id, title, description, thumbnail, source, type, language, slug, published_at,
      content_categories(categories(name, slug)),
      content_tags(tags(name))`,
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

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.lang) {
    query = query.eq("language", filters.lang);
  }

  if (filters.category) {
    query = query.eq("content_categories.categories.slug", filters.category);
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
      content_categories(categories(name, slug)),
      content_tags(tags(name))`,
    )
    .eq("id", parsed.id)
    .single();

  if (!data || data.status !== "published") return null;
  return mapToFeedItem(data as unknown as ContentRow);
}
