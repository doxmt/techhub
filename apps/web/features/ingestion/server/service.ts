import { createAdminClient } from "../../../lib/supabase/admin";
import { parseRssFeed, normalizeItem, type IngestionSource } from "./parser";
import { classifyCategory } from "./classify";

const MAX_ITEMS_PER_SOURCE = 30;
const FETCH_TIMEOUT_MS = 10_000;

export type IngestionResult = {
  status: "success" | "partial" | "failed";
  processed: number;
  created: number;
  skipped: number;
  failed: number;
};

/**
 * 활성 소스 전체를 순회해 RSS/Atom 피드를 수집하고 content_items에 적재한다.
 */
export async function runIngestion(): Promise<IngestionResult> {
  const adminClient = createAdminClient();

  // 1. 활성 소스 조회
  const { data: sources, error: sourcesError } = await adminClient
    .from("sources")
    .select()
    .eq("is_active", true);

  if (sourcesError || !sources) {
    return { status: "failed", processed: 0, created: 0, skipped: 0, failed: 0 };
  }

  // 2. categories 슬러그 → id 맵 (한 번만 조회)
  const categoryMap = new Map<string, number>();
  try {
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, slug");
    if (Array.isArray(categories)) {
      for (const cat of categories as Array<{ id: number; slug: string }>) {
        categoryMap.set(cat.slug, cat.id);
      }
    }
  } catch {
    // 카테고리 조회 실패는 무시 (수집 자체에 영향 없음)
  }

  // 3. ingestion_run 시작 기록
  const { data: runData } = await adminClient
    .from("ingestion_runs")
    .insert({ status: "running" });

  const runId = (runData as Array<{ id: string | number }> | null)?.[0]?.id ?? null;

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let totalFailed = 0;

  // 4. 소스별 순회
  for (const source of sources as IngestionSource[]) {
    try {
      // fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let xml: string;
      try {
        const response = await fetch(source.feed_url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        xml = await response.text();
      } finally {
        clearTimeout(timeoutId);
      }

      // 파싱
      const items = await parseRssFeed(xml);
      const limited = items.slice(0, MAX_ITEMS_PER_SOURCE);

      if (limited.length === 0) {
        // 빈 피드 → 이 소스는 성공
        // last_ingested_at 갱신 시도 (실패해도 무관)
        void updateLastIngested(adminClient, source.id);
        continue;
      }

      // 정규화 (link가 있는 항목만)
      const payloads = limited
        .filter((item) => item.link)
        .map((item) => normalizeItem(item, source));

      totalProcessed += payloads.length;

      // insert-only (ON CONFLICT (url) DO NOTHING)
      const insertResult = await adminClient
        .from("content_items")
        .insert(payloads as Parameters<ReturnType<typeof adminClient.from>["insert"]>[0]);

      const { data: insertData, error: insertError, count } = insertResult as {
        data: Array<unknown> | null;
        error: unknown;
        count?: number | null;
      };

      if (insertError) {
        totalFailed += 1;
        continue;
      }

      // 실제 insert된 건수: count 필드 우선, 없으면 data.length
      const insertedCount =
        typeof count === "number" ? count
        : Array.isArray(insertData) ? insertData.length
        : 0;

      totalCreated += insertedCount;
      totalSkipped += payloads.length - insertedCount;

      // 카테고리 연결 (data에 id가 있을 때만)
      if (Array.isArray(insertData) && insertData.length > 0 && categoryMap.size > 0) {
        const categoryInserts = (insertData as Array<{ id: number }>)
          .map((item, idx) => {
            const payload = payloads[idx];
            if (!payload) return null;
            const slug = classifyCategory(payload.title ?? "", payload.description);
            const categoryId = slug ? categoryMap.get(slug) : undefined;
            if (categoryId === undefined) return null;
            return { content_id: item.id, category_id: categoryId };
          })
          .filter((x): x is { content_id: number; category_id: number } => x !== null);

        if (categoryInserts.length > 0) {
          void adminClient.from("content_categories").insert(categoryInserts);
        }
      }

      // last_ingested_at 갱신 (실패해도 소스 처리 실패로 카운트하지 않음)
      void updateLastIngested(adminClient, source.id);
    } catch {
      totalFailed += 1;
    }
  }

  // 5. 상태 결정
  const totalSources = sources.length;
  let finalStatus: "success" | "partial" | "failed";
  if (totalSources === 0 || totalFailed === 0) {
    finalStatus = "success";
  } else if (totalFailed < totalSources) {
    finalStatus = "partial";
  } else {
    finalStatus = "failed";
  }

  // 6. ingestion_run 완료 기록
  if (runId !== null) {
    await adminClient
      .from("ingestion_runs")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        processed_count: totalProcessed,
        created_count: totalCreated,
        skipped_count: totalSkipped,
        failed_count: totalFailed,
      })
      .eq("id", runId);
  }

  return {
    status: finalStatus,
    processed: totalProcessed,
    created: totalCreated,
    skipped: totalSkipped,
    failed: totalFailed,
  };
}

async function updateLastIngested(
  adminClient: ReturnType<typeof createAdminClient>,
  sourceId: string | number,
) {
  try {
    await adminClient
      .from("sources")
      .update({ last_ingested_at: new Date().toISOString() })
      .eq("id", sourceId);
  } catch {
    // 갱신 실패는 무시
  }
}
