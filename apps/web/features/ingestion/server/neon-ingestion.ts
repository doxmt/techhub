import { query } from "../../../lib/db";
import { getAdapter } from "./adapters";
import { classifyCategories } from "./classify";
import { fetchOgMeta } from "./og-scraper";
import type { ContentItemInsert, IngestionSource } from "./parser";
import type { IngestionResult } from "./service";

type Section = "article" | "news" | "contest";
type SourceResult = Omit<IngestionResult, "status"> & { errors: string[] };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function ingestOne(
  source: IngestionSource,
  categoryMap: Map<string, string>,
): Promise<SourceResult> {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];
  let processed = 0;
  try {
    const adapter = getAdapter(source.feed_type);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), source.section === "contest" ? 45_000 : 10_000);
    let payloads: ContentItemInsert[];
    try { payloads = await adapter(source, controller.signal); }
    finally { clearTimeout(timer); }
    const configured = Number(process.env.INGEST_CONTEST_MAX_ITEMS);
    const limit = source.section === "contest"
      ? Number.isInteger(configured) && configured > 0 ? configured : 60
      : source.name === "GeekNews" ? 30 : 10;
    payloads = payloads.slice(0, limit);
    payloads = await Promise.all(payloads.map(async (item) => {
      if (item.thumbnail || !item.url || item.url.includes("wevity.com")) return item;
      const og = await fetchOgMeta(item.url);
      return og.image ? { ...item, thumbnail: og.image } : item;
    }));
    const seenSlugs = new Set<string>();
    const seenUrls = new Set<string>();
    payloads = payloads.filter((item) => {
      if (seenSlugs.has(item.slug) || seenUrls.has(item.url)) return false;
      seenSlugs.add(item.slug);
      seenUrls.add(item.url);
      return true;
    });
    processed = payloads.length;
    const existing = payloads.length
      ? await query<{ id: string; slug: string; url: string }>(
          "select id::text, slug, url from content_items where slug = any($1::text[])",
          [payloads.map((item) => item.slug)],
        ) : [];
    const bySlug = new Map(existing.map((row) => [row.slug, row]));

    for (const item of payloads) {
      const prior = bySlug.get(item.slug);
      if (prior) {
        skipped++;
        if (item.section === "contest") {
          try {
            await query(`update content_items set
              url = case when $2::text <> '' and $2::text not like '%wevity.com%'
                then $2 else url end,
              thumbnail = coalesce($3, thumbnail),
              deadline = coalesce($4::timestamptz, deadline),
              published_at = coalesce($5::timestamptz, published_at),
              updated_at = now()
              where id = $1::bigint`,
              [prior.id, item.url || "", item.thumbnail, item.deadline ?? null, item.published_at]);
          } catch { /* A conflicting URL should not block other items. */ }
        }
        continue;
      }
      if (!item.title) { failed++; errors.push(`${source.name}: missing title`); continue; }
      try {
        const inserted = await query<{ id: string }>(`
          insert into content_items
          (url, slug, type, section, title, description, thumbnail, source,
           language, status, published_at, deadline, contest_type)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11::timestamptz, $12::timestamptz, $13)
          on conflict (url) do nothing returning id::text`,
          [item.url, item.slug, item.type, item.section, item.title,
            item.description, item.thumbnail, item.source, item.language,
            item.status, item.published_at, item.deadline ?? null,
            item.contest_type ?? null]);
        if (!inserted[0]) { skipped++; continue; }
        created++;
        if (item.section !== "contest") {
          const slugs = classifyCategories({
            title: item.title, description: item.description,
            rssCategories: item.rssCategories,
          });
          for (const slug of slugs) {
            const categoryId = categoryMap.get(slug);
            if (!categoryId) continue;
            await query(`insert into content_categories (content_id, category_id)
              values ($1::bigint, $2::bigint) on conflict do nothing`,
            [inserted[0].id, categoryId]);
          }
        }
      } catch (error) { failed++; errors.push(`${source.name}: ${errorText(error)}`); }
    }
    await query("update sources set last_ingested_at = now() where id = $1::bigint", [source.id]);
  } catch (error) {
    failed++;
    errors.push(`${source.name}: ${errorText(error)}`);
  }
  return { processed, created, skipped, failed, errors };
}

export async function runNeonIngestion(section?: Section): Promise<IngestionResult> {
  const sources = await query<IngestionSource & { id: string }>(`
    select id::text, name, feed_url, feed_type, default_language, section
    from sources where is_active = true and ($1::text is null or section = $1)
    order by last_ingested_at asc nulls first, id asc`, [section ?? null]);
  const categories = await query<{ id: string; slug: string }>(
    "select id::text, slug from categories",
  );
  const categoryMap = new Map(categories.map((row) => [row.slug, row.id]));
  const run = await query<{ id: string }>(
    "insert into ingestion_runs (status) values ('running') returning id::text",
  );
  let next = 0;
  const results: SourceResult[] = new Array(sources.length);
  async function worker() {
    while (next < sources.length) {
      const index = next++;
      results[index] = await ingestOne(sources[index]!, categoryMap);
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, sources.length) }, worker));
  const processed = results.reduce((n, r) => n + r.processed, 0);
  const created = results.reduce((n, r) => n + r.created, 0);
  const skipped = results.reduce((n, r) => n + r.skipped, 0);
  const failed = results.reduce((n, r) => n + r.failed, 0);
  const status = failed === 0 ? "success"
    : results.some((r) => r.failed === 0) ? "partial" : "failed";
  const errors = results.flatMap((r) => r.errors).join("\n").slice(0, 4000);
  await query(`update ingestion_runs set status = $1, finished_at = now(),
    processed_count = $2, created_count = $3, skipped_count = $4,
    failed_count = $5, error_message = $6 where id = $7::bigint`,
  [status, processed, created, skipped, failed, errors || null, run[0]!.id]);
  return { status, processed, created, skipped, failed };
}
