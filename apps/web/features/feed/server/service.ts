import { createClient } from "../../../lib/supabase/server";
import { encodeCursor, decodeCursor } from "../../../lib/cursor";
import type {
  ContentType,
  ContestStatus,
  ContestTypeSlug,
  FeedSection,
} from "@techhub/shared";

type DbFeedSection = Extract<FeedSection, "article" | "news" | "contest">;

export type FeedItem = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  source: string | null;
  type: ContentType;
  section?: DbFeedSection;
  language: string;
  slug: string;
  publishedAt: string;
  categories: { name: string; slug: string }[];
  tags: { name: string }[];
  viewCount: number;
  likesCount: number;
  deadline?: string | null;
  contestType?: string | null;
  isBookmarked?: boolean;
  isLiked?: boolean;
};

export type FeedSort = "latest" | "oldest" | "views" | "recommended";
export type FeedPeriod = "day" | "week" | "month" | "all";

export type FeedFilters = {
  q?: string;
  categories?: string[];
  source?: string;
  type?: ContentType;
  lang?: string;
  section?: FeedSection;
  sort?: FeedSort;
  period?: FeedPeriod;
  cstatus?: ContestStatus;
  ctype?: ContestTypeSlug;
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
  section: string | null;
  language: string | null;
  slug: string;
  published_at: string | null;
  status?: string;
  view_count: number;
  likes_count: number;
  deadline: string | null;
  contest_type: string | null;
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
    section:
      row.section === "news" || row.section === "contest"
        ? row.section
        : "article",
    language: row.language ?? "ko",
    slug: row.slug,
    publishedAt: row.published_at ?? "",
    viewCount: row.view_count ?? 0,
    likesCount: row.likes_count ?? 0,
    deadline: row.deadline ?? null,
    contestType: row.contest_type ?? null,
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

  const sort = filters.sort ?? "latest";
  const period = filters.period ?? "all";

  let query = supabase
    .from("content_items")
    .select(
      `id, title, description, thumbnail, source, type, section, language, slug, published_at,
      url, view_count, likes_count, deadline, contest_type,
      ${relationSelect}`,
    )
    .eq("status", "published")
    .limit(PAGE_SIZE + 1);

  // 정렬
  if (sort === "oldest") {
    query = query.order("published_at", { ascending: true }).order("id", { ascending: true });
  } else if (sort === "views") {
    query = query.order("view_count", { ascending: false }).order("id", { ascending: false });
  } else if (sort === "recommended") {
    query = query.order("likes_count", { ascending: false }).order("id", { ascending: false });
  } else {
    query = query.order("published_at", { ascending: false }).order("id", { ascending: false });
  }

  // 기간 필터
  if (period !== "all") {
    const ms = { day: 86400000, week: 604800000, month: 2592000000 }[period]!;
    const cutoff = new Date(Date.now() - ms).toISOString();
    query = query.gte("published_at", cutoff);
  }

  // 커서
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      if (sort === "oldest") {
        query = query.or(
          `published_at.gt.${decoded.publishedAt},and(published_at.eq.${decoded.publishedAt},id.gt.${decoded.id})`,
        );
      } else if (sort === "views") {
        query = query.or(
          `view_count.lt.${decoded.countValue},and(view_count.eq.${decoded.countValue},id.lt.${decoded.id})`,
        );
      } else if (sort === "recommended") {
        query = query.or(
          `likes_count.lt.${decoded.countValue},and(likes_count.eq.${decoded.countValue},id.lt.${decoded.id})`,
        );
      } else {
        query = query.or(
          `published_at.lt.${decoded.publishedAt},and(published_at.eq.${decoded.publishedAt},id.lt.${decoded.id})`,
        );
      }
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

  if (
    filters.section === "article" ||
    filters.section === "news" ||
    filters.section === "contest"
  ) {
    query = query.eq("section", filters.section);
  }

  // 공모전 진행 상태: deadline 기준 파생 (deadline 없음 = 상시 → 진행중)
  if (filters.section === "contest") {
    const nowIso = new Date().toISOString();
    if (filters.cstatus === "closed") {
      query = query.lt("deadline", nowIso);
    } else {
      query = query.or(`deadline.gte.${nowIso},deadline.is.null`);
    }
    if (filters.ctype) {
      query = query.eq("contest_type", filters.ctype);
    }
  }

  if (filters.type) {
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
  const lastRow = rows[rows.length - 1] as unknown as ContentRow;

  let nextCursor: string | null = null;
  if (hasMore) {
    if (sort === "views") {
      nextCursor = encodeCursor({ id: lastRow.id, countValue: lastRow.view_count });
    } else if (sort === "recommended") {
      nextCursor = encodeCursor({ id: lastRow.id, countValue: lastRow.likes_count });
    } else {
      nextCursor = encodeCursor({ publishedAt: lastRow.published_at!, id: lastRow.id });
    }
  }

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
