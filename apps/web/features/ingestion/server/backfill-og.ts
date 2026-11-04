import { createAdminClient } from "../../../lib/supabase/admin";
import { fetchOgMeta } from "./og-scraper";
import { query } from "../../../lib/db";

const BATCH_SIZE = 20;
// Hobby 플랜 함수 제한(60s) 안에 끝나도록 OG fetch를 제한된 동시성으로 처리한다
const CONCURRENCY = 5;

export type OgBackfillResult = {
  processed: number;
  updated: number;
  failed: number;
};

export async function runOgBackfill(): Promise<OgBackfillResult> {
  if (process.env.DATABASE_URL) {
    const items = await query<{ id: string; url: string; thumbnail: string | null; description: string | null }>(
      "select id::text, url, thumbnail, description from content_items where thumbnail is null or description is null limit 20",
    );
    let next = 0;
    let updated = 0;
    let failed = 0;
    async function worker() {
      while (next < items.length) {
        const item = items[next++]!;
        try {
          const og = await fetchOgMeta(item.url);
          if ((!item.thumbnail && og.image) || (!item.description && og.description)) {
            await query(`update content_items set
              thumbnail = coalesce(thumbnail, $2),
              description = coalesce(description, $3), updated_at = now()
              where id = $1::bigint`,
            [item.id, og.image ?? null, og.description ?? null]);
            updated++;
          }
        } catch { failed++; }
      }
    }
    await Promise.all(Array.from({ length: Math.min(5, items.length) }, worker));
    return { processed: items.length, updated, failed };
  }
  const adminClient = createAdminClient();

  const { data: items, error } = await adminClient
    .from("content_items")
    .select("id, url, thumbnail, description")
    .or("thumbnail.is.null,description.is.null")
    .limit(BATCH_SIZE);

  if (error || !items || items.length === 0) {
    return { processed: 0, updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;

  const queue = items as Array<{ id: number; url: string; thumbnail: string | null; description: string | null }>;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < queue.length) {
      const item = queue[nextIndex]!;
      nextIndex += 1;

      const og = await fetchOgMeta(item.url);

      const patch: Record<string, string> = {};
      if (!item.thumbnail && og.image) patch.thumbnail = og.image;
      if (!item.description && og.description) patch.description = og.description;

      if (Object.keys(patch).length === 0) continue;

      const { error: updateError } = await adminClient
        .from("content_items")
        .update(patch)
        .eq("id", item.id);

      if (updateError) {
        failed += 1;
      } else {
        updated += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
  );

  return { processed: items.length, updated, failed };
}
