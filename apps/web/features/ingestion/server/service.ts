import { createAdminClient } from "../../../lib/supabase/admin";
import { getAdapter, type FeedAdapter } from "./adapters";
import type { IngestionSource } from "./parser";
import { classifyCategories } from "./classify";
import { fetchOgMeta } from "./og-scraper";

const FETCH_TIMEOUT_MS = 10_000;
// 공모전은 목록 여러 페이지 + 항목별 상세 fetch가 필요해 타임아웃을 따로 둔다
const CONTEST_FETCH_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_ITEMS_PER_SOURCE = 10;
// GeekNews 한국어 최신 목록은 하루 20개를 넘는 경우가 있어 별도 상한을 둔다.
const GEEKNEWS_MAX_ITEMS_PER_SOURCE = 30;
// 공모전 목록은 페이지당 16개 안팎 × 3페이지라 상한을 따로 둔다
const DEFAULT_MAX_CONTEST_ITEMS_PER_SOURCE = 60;

/** 백필 시 INGEST_CONTEST_MAX_ITEMS로 상한을 늘려 실행한다. */
function maxContestItems(): number {
  const parsed = Number(process.env.INGEST_CONTEST_MAX_ITEMS);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_CONTEST_ITEMS_PER_SOURCE;
}

function maxItemsForSource(source: IngestionSource): number {
  if (source.section === "contest" || source.section === "event") {
    return maxContestItems();
  }
  return source.name === "GeekNews"
    ? GEEKNEWS_MAX_ITEMS_PER_SOURCE
    : DEFAULT_MAX_ITEMS_PER_SOURCE;
}

const SOURCE_CONCURRENCY = 5;

type IngestionSection = "article" | "news" | "contest" | "event";
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
    const timeoutId = setTimeout(
      () => controller.abort(),
      source.section === "contest" || source.section === "event"
        ? CONTEST_FETCH_TIMEOUT_MS
        : FETCH_TIMEOUT_MS,
    );

    let allPayloads: Awaited<ReturnType<FeedAdapter>>;
    try {
      allPayloads = await adapter(source, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }

    const capped = allPayloads.slice(0, maxItemsForSource(source));

    // 썸네일 없는 항목: OG 이미지 병렬 폴백
    // 위비티 URL은 OG 메타가 사이트 공통 이미지라 제외한다 (원문 홈페이지 URL은 폴백 허용)
    const payloads = await Promise.all(
      capped.map(async (payload) => {
        if (
          payload.thumbnail ||
          !payload.url ||
          payload.url.includes("wevity.com")
        ) {
          return payload;
        }
        const { image } = await fetchOgMeta(payload.url);
        return image ? { ...payload, thumbnail: image } : payload;
      }),
    );

    if (payloads.length === 0) {
      await updateLastIngested(adminClient, source.id);
      return { processed: 0, created: 0, skipped: 0, failed: 0, errors: [] };
    }

    // 같은 배치 안의 slug/url 중복 제거.
    // 위비티 두 소스(cidx=20/21)가 같은 ix를 노출하는 경우가 실제로 있다.
    const uniquePayloads = dedupePayloads(payloads);

    // content_items.slug에는 UNIQUE 제약이 있는데 upsert의 onConflict는 컬럼 하나만
    // 지정할 수 있다. slug가 이미 있는 행을 그대로 insert하면 ON CONFLICT (url)이
    // 잡지 못해 INSERT 문 전체가 abort되고 신규 콘텐츠가 통째로 유실된다.
    // 그래서 기존 slug를 먼저 조회해 insert 대상과 갱신 대상을 나눈다.
    const existingBySlug = await fetchExistingBySlug(
      adminClient,
      uniquePayloads.map((payload) => payload.slug),
    );

    const toInsert = uniquePayloads.filter(
      (payload) => !existingBySlug.has(payload.slug),
    );
    const toRefresh = uniquePayloads.filter((payload) =>
      existingBySlug.has(payload.slug),
    );

    const { insertData, insertedCount, insertError } = await insertPayloads(
      adminClient,
      toInsert,
    );

    if (insertError) {
      return {
        processed: uniquePayloads.length,
        created: insertedCount,
        skipped: 0,
        failed: 1,
        errors: [`${source.name}: ${errorMessage(insertError)}`],
      };
    }

    // 카테고리 연결: insertData의 id를 url로 capped payload에 매핑 (index 불일치 방지)
    if (Array.isArray(insertData) && insertData.length > 0 && categoryMap.size > 0) {
      const urlToPayload = new Map(payloads.map((p) => [p.url, p]));
      const categoryInserts = (insertData as Array<{ id: number; url?: string }>)
        .flatMap((item) => {
          const payload = item.url ? urlToPayload.get(item.url) : undefined;
          if (!payload) return [];
          // 공모전은 주제 카테고리 대신 contest_type으로, 행사는 분류 없이 둔다
          if (payload.section === "contest" || payload.section === "event") return [];
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

    // 공모전은 등록 후에도 홈페이지 링크, 포스터, 접수 마감일이 계속 바뀐다.
    // 이미 있는 행은 insert가 아니라 update로 최신값을 반영한다.
    await refreshContests(adminClient, toRefresh, existingBySlug);

    // last_ingested_at 갱신 (실패해도 소스 처리 실패로 카운트하지 않음)
    await updateLastIngested(adminClient, source.id);

    return {
      processed: uniquePayloads.length,
      created: insertedCount,
      skipped: uniquePayloads.length - insertedCount,
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

type Payload = Awaited<ReturnType<FeedAdapter>>[number];
type ExistingRow = { id: number; slug: string; url: string };

/** 같은 배치 안에서 slug나 url이 겹치는 항목을 하나만 남긴다. */
function dedupePayloads(payloads: Payload[]): Payload[] {
  const seenSlugs = new Set<string>();
  const seenUrls = new Set<string>();
  return payloads.filter((payload) => {
    if (seenSlugs.has(payload.slug) || seenUrls.has(payload.url)) return false;
    seenSlugs.add(payload.slug);
    seenUrls.add(payload.url);
    return true;
  });
}

/** 이미 DB에 있는 slug를 조회해 slug → 행 맵으로 돌려준다. */
async function fetchExistingBySlug(
  adminClient: AdminClient,
  slugs: string[],
): Promise<Map<string, ExistingRow>> {
  const map = new Map<string, ExistingRow>();
  if (slugs.length === 0) return map;

  const { data } = (await adminClient
    .from("content_items")
    .select("id, slug, url")
    .in("slug", slugs)) as { data: ExistingRow[] | null };

  for (const row of data ?? []) {
    map.set(row.slug, row);
  }
  return map;
}

/**
 * 신규 항목을 배치 upsert한다.
 * 한 행의 제약 위반이 배치 전체를 죽이지 않도록, 배치가 실패하면 행 단위로 재시도한다.
 */
async function insertPayloads(
  adminClient: AdminClient,
  payloads: Payload[],
): Promise<{
  insertData: Array<{ id: number; url?: string }>;
  insertedCount: number;
  insertError: unknown;
}> {
  if (payloads.length === 0) {
    return { insertData: [], insertedCount: 0, insertError: null };
  }

  // rssCategories는 DB 컬럼이 아니므로 insert 전에 제거
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toRow = ({ rssCategories, ...rest }: Payload) => rest;

  const upsert = (rows: unknown[]) =>
    adminClient
      .from("content_items")
      .upsert(rows as Parameters<ReturnType<typeof adminClient.from>["upsert"]>[0], {
        onConflict: "url",
        ignoreDuplicates: true,
        count: "exact",
      })
      .select("id, url");

  const batch = (await upsert(payloads.map(toRow))) as {
    data: Array<{ id: number; url?: string }> | null;
    error: unknown;
    count?: number | null;
  };

  if (!batch.error) {
    const insertData = batch.data ?? [];
    return {
      insertData,
      insertedCount:
        typeof batch.count === "number" ? batch.count : insertData.length,
      insertError: null,
    };
  }

  // 배치 실패 → 행 단위 재시도. 문제 행만 버리고 나머지는 살린다.
  const insertData: Array<{ id: number; url?: string }> = [];
  let insertedCount = 0;
  let lastRowError: unknown = null;
  for (const payload of payloads) {
    const single = (await upsert([toRow(payload)])) as {
      data: Array<{ id: number; url?: string }> | null;
      error: unknown;
      count?: number | null;
    };
    if (single.error) {
      lastRowError = single.error;
      continue;
    }
    const rows = single.data ?? [];
    insertData.push(...rows);
    insertedCount += typeof single.count === "number" ? single.count : rows.length;
  }

  // 한 건도 못 살렸으면 소스 실패로 올린다
  return {
    insertData,
    insertedCount,
    insertError: insertedCount === 0 ? (lastRowError ?? batch.error) : null,
  };
}

/** 이미 존재하는 공모전의 홈페이지 url, 포스터, 마감일을 최신값으로 갱신한다. */
async function refreshContests(
  adminClient: AdminClient,
  payloads: Payload[],
  existingBySlug: Map<string, ExistingRow>,
) {
  for (const payload of payloads) {
    if (payload.section !== "contest" && payload.section !== "event") continue;

    const existing = existingBySlug.get(payload.slug);
    if (!existing) continue;

    const patch: Record<string, unknown> = {};
    // 위비티 폴백 URL로는 되돌리지 않는다 (원문 홈페이지가 우선)
    if (
      payload.url &&
      payload.url !== existing.url &&
      !payload.url.includes("wevity.com")
    ) {
      patch.url = payload.url;
    }
    if (payload.thumbnail) patch.thumbnail = payload.thumbnail;
    if (payload.deadline) patch.deadline = payload.deadline;
    // 공고 등록일. 어댑터가 출처의 안정적인 값에서 파생하므로 재실행해도 값이 흔들리지 않는다
    if (payload.published_at) patch.published_at = payload.published_at;

    if (Object.keys(patch).length === 0) continue;

    // url UNIQUE 충돌 등은 해당 행만 실패하므로 결과를 무시한다
    await adminClient.from("content_items").update(patch).eq("id", existing.id);
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
