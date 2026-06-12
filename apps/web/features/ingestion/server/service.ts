import { createAdminClient } from "../../../lib/supabase/admin";
import { getAdapter, type FeedAdapter } from "./adapters";
import type { IngestionSource } from "./parser";
import { classifyCategories } from "./classify";
import { fetchOgMeta } from "./og-scraper";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS_PER_SOURCE = 10;
const SOURCE_CONCURRENCY = 5;

type IngestionSection = "article" | "news";
type AdminClient = ReturnType<typeof createAdminClient>;

export type IngestionResult = {
  status: "success" | "partial" | "failed";
  processed: number;
  created: number;
  skipped: number;
  failed: number;
};

type RunIngestionOptions = {
  section?: IngestionSection;
};

type SourceIngestionResult = Omit<IngestionResult, "status"> & {
  errors: string[];
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

/**
 * 활성 소스 전체를 순회해 RSS/Atom 피드를 수집하고 content_items에 적재한다.
 */
export async function runIngestion(
  options: RunIngestionOptions = {},
): Promise<IngestionResult> {
  const adminClient = createAdminClient();

  // 1. 활성 소스 조회
  let sourcesQuery = adminClient
    .from("sources")
    .select()
    .eq("is_active", true)
    .order("last_ingested_at", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true });

  if (options.section) {
    sourcesQuery = sourcesQuery.eq("section", options.section);
  }

  const { data: sources, error: sourcesError } = await sourcesQuery;

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
    .insert({ status: "running" })
    .select("id");

  const runId = (runData as Array<{ id: string | number }> | null)?.[0]?.id ?? null;

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  // 4. 소스별 순회. Vercel cron 함수 제한에 걸리지 않도록 제한된 동시성으로 처리한다.
  const sourceResults = await mapWithConcurrency(
    sources as IngestionSource[],
    SOURCE_CONCURRENCY,
    (source) => ingestSource(adminClient, source, categoryMap),
  );

  for (const result of sourceResults) {
    totalProcessed += result.processed;
    totalCreated += result.created;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
    errors.push(...result.errors);
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
        error_message: errors.length > 0 ? errors.join("\n").slice(0, 4000) : null,
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

async function ingestSource(
  adminClient: AdminClient,
  source: IngestionSource,
  categoryMap: Map<string, number>,
): Promise<SourceIngestionResult> {
  try {
    let adapter: FeedAdapter;
    try {
      adapter = getAdapter(source.feed_type);
    } catch (error) {
      return {
        processed: 0,
        created: 0,
        skipped: 0,
        failed: 1,
        errors: [`${source.name}: ${errorMessage(error)}`],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let allPayloads: Awaited<ReturnType<FeedAdapter>>;
    try {
      allPayloads = await adapter(source, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }

    const capped = allPayloads.slice(0, MAX_ITEMS_PER_SOURCE);

    // 썸네일 없는 항목: OG 이미지 병렬 폴백
    const payloads = await Promise.all(
      capped.map(async (payload) => {
        if (payload.thumbnail || !payload.url) return payload;
        const { image } = await fetchOgMeta(payload.url);
        return image ? { ...payload, thumbnail: image } : payload;
      }),
    );

    if (payloads.length === 0) {
      await updateLastIngested(adminClient, source.id);
      return { processed: 0, created: 0, skipped: 0, failed: 0, errors: [] };
    }

    // rssCategories는 DB 컬럼이 아니므로 insert 전에 제거
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dbPayloads = payloads.map(({ rssCategories, ...rest }) => rest);

    // 중복 URL은 무시하고 신규 항목만 insert, select id+url for category linking
    const insertResult = await adminClient
      .from("content_items")
      .upsert(dbPayloads as Parameters<ReturnType<typeof adminClient.from>["upsert"]>[0], {
        onConflict: "url",
        ignoreDuplicates: true,
        count: "exact",
      })
      .select("id, url");

    const { data: insertData, error: insertError, count } = insertResult as {
      data: Array<unknown> | null;
      error: unknown;
      count?: number | null;
    };

    if (insertError) {
      return {
        processed: payloads.length,
        created: 0,
        skipped: 0,
        failed: 1,
        errors: [`${source.name}: ${errorMessage(insertError)}`],
      };
    }

    // 실제 insert된 건수: count 필드 우선, 없으면 data.length
    const insertedCount =
      typeof count === "number" ? count
      : Array.isArray(insertData) ? insertData.length
      : 0;

    // 카테고리 연결: insertData의 id를 url로 capped payload에 매핑 (index 불일치 방지)
    if (Array.isArray(insertData) && insertData.length > 0 && categoryMap.size > 0) {
      const urlToPayload = new Map(payloads.map((p) => [p.url, p]));
      const categoryInserts = (insertData as Array<{ id: number; url?: string }>)
        .flatMap((item) => {
          const payload = item.url ? urlToPayload.get(item.url) : undefined;
          if (!payload) return [];
          const slugs = classifyCategories({
            title: payload.title ?? "",
            description: payload.description,
            rssCategories: payload.rssCategories,
          });
          return slugs
            .map((slug) => {
              const categoryId = categoryMap.get(slug);
              if (!categoryId) return null;
              return { content_id: item.id, category_id: categoryId };
            })
            .filter((x): x is { content_id: number; category_id: number } => x !== null);
        });

      if (categoryInserts.length > 0) {
        await adminClient
          .from("content_categories")
          .upsert(categoryInserts, { ignoreDuplicates: true });
      }
    }

    // last_ingested_at 갱신 (실패해도 소스 처리 실패로 카운트하지 않음)
    await updateLastIngested(adminClient, source.id);

    return {
      processed: payloads.length,
      created: insertedCount,
      skipped: payloads.length - insertedCount,
      failed: 0,
      errors: [],
    };
  } catch (error) {
    return {
      processed: 0,
      created: 0,
      skipped: 0,
      failed: 1,
      errors: [`${source.name}: ${errorMessage(error)}`],
    };
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

async function updateLastIngested(
  adminClient: AdminClient,
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
