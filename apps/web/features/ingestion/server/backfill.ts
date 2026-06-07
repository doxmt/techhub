import { createAdminClient } from "../../../lib/supabase/admin";
import { classifyCategory } from "./classify";

const WOOWAHAN_API =
  "https://techblog.woowahan.com/wp-json/wp/v2/posts?per_page=100&_fields=id,title,link,date,excerpt";

type WpPost = {
  id: number;
  title: { rendered: string };
  link: string;
  date: string;
  excerpt: { rendered: string };
};

function stripHtml(html: string): string {
  const decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return decoded.replace(/<[^>]*>/g, "").trim();
}

/**
 * 우아한형제들 WordPress REST API 전체 수집
 */
export async function runWoowahBackfill(): Promise<{
  created: number;
  skipped: number;
  failed: number;
}> {
  const adminClient = createAdminClient();

  // categories 슬러그 → id 맵 (한 번만 조회)
  const { data: categories } = await adminClient
    .from("categories")
    .select("id, slug");

  const categoryMap = new Map<string, number>();
  if (Array.isArray(categories)) {
    for (const cat of categories as Array<{ id: number; slug: string }>) {
      categoryMap.set(cat.slug, cat.id);
    }
  }

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  let page = 1;

  while (true) {
    let posts: WpPost[];

    try {
      const res = await fetch(`${WOOWAHAN_API}&page=${page}`);
      if (!res.ok) {
        totalFailed += 1;
        break;
      }
      posts = (await res.json()) as WpPost[];
    } catch {
      totalFailed += 1;
      break;
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      break;
    }

    for (const post of posts) {
      const title = stripHtml(post.title?.rendered ?? "");
      const description = stripHtml(post.excerpt?.rendered ?? "") || null;
      const slug = `woowahan-${post.id}`;

      const payload = {
        url: post.link,
        slug,
        type: "article" as const,
        title: title || null,
        description,
        thumbnail: null,
        source: "우아한형제들",
        language: "ko" as const,
        status: "published" as const,
        published_at: post.date
          ? new Date(post.date).toISOString()
          : new Date().toISOString(),
      };

      const { data: insertData, error: insertError } = await adminClient
        .from("content_items")
        .insert(payload)
        .select("id");

      if (insertError) {
        totalFailed += 1;
        continue;
      }

      const inserted = Array.isArray(insertData) ? insertData : [];
      const wasInserted = inserted.length > 0;

      if (!wasInserted) {
        totalSkipped += 1;
        continue;
      }

      totalCreated += 1;

      // 카테고리 연결
      const categorySlug = classifyCategory(title, description);
      const categoryId = categorySlug ? categoryMap.get(categorySlug) : undefined;

      if (categoryId !== undefined && inserted[0]) {
        const contentId = (inserted[0] as { id: number }).id;
        await adminClient.from("content_categories").insert({
          content_id: contentId,
          category_id: categoryId,
        });
      }
    }

    if (posts.length < 100) {
      break;
    }

    page += 1;
  }

  return { created: totalCreated, skipped: totalSkipped, failed: totalFailed };
}
