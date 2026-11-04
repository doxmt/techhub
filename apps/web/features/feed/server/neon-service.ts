import { decodeCursor, encodeCursor } from "../../../lib/cursor";
import { query, queryAsUser } from "../../../lib/db";
import type { FeedFilters, FeedItem, FeedSort } from "./service";

export type Row = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  source: string | null;
  type: FeedItem["type"];
  section: FeedItem["section"];
  language: string | null;
  slug: string;
  published_at: Date;
  view_count: number;
  likes_count: number;
  deadline: Date | null;
  contest_type: string | null;
  categories: { name: string; slug: string }[];
  tags: { name: string }[];
  is_bookmarked: boolean;
  is_liked: boolean;
};

export function mapNeonFeedItem(row: Row): FeedItem {
  return {
    id: String(row.id),
    url: row.url,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail,
    source: row.source,
    type: row.type,
    section: row.section,
    language: row.language ?? "ko",
    slug: row.slug,
    publishedAt: row.published_at.toISOString(),
    viewCount: row.view_count,
    likesCount: row.likes_count,
    deadline: row.deadline?.toISOString() ?? null,
    contestType: row.contest_type,
    categories: row.categories,
    tags: row.tags,
    isBookmarked: row.is_bookmarked,
    isLiked: row.is_liked,
  };
}

export const feedSelect = `
  ci.id::text, ci.url, ci.title, ci.description, ci.thumbnail, ci.source,
  ci.type, ci.section, ci.language, ci.slug, ci.published_at,
  ci.view_count, ci.likes_count, ci.deadline, ci.contest_type,
  coalesce((select jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug)
    order by c.name) from content_categories cc join categories c on c.id = cc.category_id
    where cc.content_id = ci.id), '[]'::jsonb) as categories,
  coalesce((select jsonb_agg(jsonb_build_object('name', t.name) order by t.name)
    from content_tags ct join tags t on t.id = ct.tag_id
    where ct.content_id = ci.id), '[]'::jsonb) as tags`;

export async function getNeonFeed(
  filters: FeedFilters,
  cursor?: string,
  userId?: string,
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const values: unknown[] = [];
  const param = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = ["ci.status = 'published'"];
  const sort: FeedSort = filters.sort ?? "latest";
  const orderColumn = sort === "views" ? "ci.view_count"
    : sort === "recommended" ? "ci.likes_count" : "ci.published_at";
  const direction = sort === "oldest" ? "asc" : "desc";

  if (filters.section === "article" || filters.section === "news" || filters.section === "contest") {
    where.push(`ci.section = ${param(filters.section)}`);
  }
  if (filters.type) where.push(`ci.type = ${param(filters.type)}`);
  if (filters.lang) where.push(`ci.language = ${param(filters.lang)}`);
  if (filters.source) where.push(`ci.source = ${param(filters.source)}`);
  if (filters.categories?.length) {
    where.push(`exists (select 1 from content_categories cc join categories c
      on c.id = cc.category_id where cc.content_id = ci.id
      and c.slug = any(${param(filters.categories)}::text[]))`);
  }
  if (filters.q?.trim()) {
    where.push(`ci.search_vector @@ websearch_to_tsquery('simple', ${param(filters.q.trim())})`);
  }
  if (filters.period && filters.period !== "all") {
    const ms = { day: 86400000, week: 604800000, month: 2592000000 }[filters.period];
    where.push(`ci.published_at >= ${param(new Date(Date.now() - ms))}`);
  }
  if (filters.section === "contest") {
    if (filters.cstatus === "closed") where.push("ci.deadline < now()");
    else where.push("(ci.deadline >= now() or ci.deadline is null)");
    if (filters.ctype) where.push(`ci.contest_type = ${param(filters.ctype)}`);
  }
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const countSort = sort === "views" || sort === "recommended";
      const value = countSort ? decoded.countValue : decoded.publishedAt;
      if (value !== undefined) {
        const mark = param(value);
        const id = param(decoded.id);
        const op = sort === "oldest" ? ">" : "<";
        where.push(`(${orderColumn}, ci.id) ${op} (${mark}, ${id}::bigint)`);
      }
    }
  }
  const uid = param(userId ?? null);
  const sql = `
    select ${feedSelect},
      exists(select 1 from bookmarks b where b.content_id = ci.id and b.user_id = ${uid}::uuid) as is_bookmarked,
      exists(select 1 from likes l where l.content_id = ci.id and l.user_id = ${uid}::uuid) as is_liked
    from content_items ci
    where ${where.join(" and ")}
    order by ${orderColumn} ${direction}, ci.id ${direction}
    limit 21`;
  const rows = userId
    ? await queryAsUser<Row>(userId, sql, values)
    : await query<Row>(sql, values);
  const hasMore = rows.length > 20;
  const page = rows.slice(0, 20);
  const items = page.map(mapNeonFeedItem);
  const last = page.at(-1);
  const nextCursor = hasMore && last
    ? sort === "views" ? encodeCursor({ id: Number(last.id), countValue: last.view_count })
      : sort === "recommended" ? encodeCursor({ id: Number(last.id), countValue: last.likes_count })
        : encodeCursor({ id: Number(last.id), publishedAt: last.published_at.toISOString() })
    : null;
  return { items, nextCursor };
}
