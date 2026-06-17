import { createAdminClient } from "../../../lib/supabase/admin";
import { fetchOgMeta } from "./og-scraper";

const BATCH_SIZE = 20;
// Hobby 플랜 함수 제한(60s) 안에 끝나도록 OG fetch를 제한된 동시성으로 처리한다
const CONCURRENCY = 5;

export type OgBackfillResult = {
  processed: number;
  updated: number;
  failed: number;
};

export async function runOgBackfill(): Promise<OgBackfillResult> {
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
