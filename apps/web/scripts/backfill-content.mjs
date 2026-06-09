import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { classifyCategories } from "../features/ingestion/server/classify.ts";
import { normalizeItem } from "../features/ingestion/server/parser.ts";

const DEFAULT_CHECKPOINT = path.resolve(
  process.cwd(),
  "../../.backfill/content-backfill.json"
);
const DEFAULT_DELAY_MS = 1200;
const DEFAULT_MAX_PAGES = 50;

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["enclosure", "enclosure"],
      ["description", "description"],
      ["thumbnail", "thumbnail"],
    ],
  },
});

const STRATEGIES = {
  "네이버 D2": {
    type: "naver-d2-api",
    apiUrl: "https://d2.naver.com/api/v1/contents",
    pageSize: 100,
  },
  "카카오 테크": {
    type: "kakao-api",
    apiUrl: "https://tech.kakao.com/api/v2/posts",
    code: "blog",
  },
  토스: {
    type: "toss-api",
    apiUrl:
      "https://api-public.toss.im/api-public/v3/ipd-thor/api/v1/workspaces/15/posts",
    pageSize: 100,
  },
  우아한형제들: {
    type: "wordpress",
    apiUrl:
      "https://techblog.woowahan.com/wp-json/wp/v2/posts?per_page=100&_fields=id,title,link,date,excerpt",
  },
  "쿠팡 엔지니어링": {
    type: "medium-rss-bundle",
    feedUrls: [
      "https://medium.com/feed/coupang-engineering",
      "https://medium.com/feed/coupang-engineering/tagged/ai",
      "https://medium.com/feed/coupang-engineering/tagged/data",
      "https://medium.com/feed/coupang-engineering/tagged/infrastructure",
      "https://medium.com/feed/coupang-engineering/tagged/mobile",
      "https://medium.com/feed/coupang-engineering/tagged/technology",
      "https://medium.com/feed/coupang-engineering/tagged/machine-learning",
      "https://medium.com/feed/coupang-engineering/tagged/backend",
      "https://medium.com/feed/coupang-engineering/tagged/android",
    ],
  },
  당근마켓: {
    type: "medium-rss-bundle",
    feedUrls: [
      "https://medium.com/feed/daangn",
      "https://medium.com/feed/daangn/tagged/engineering",
      "https://medium.com/feed/daangn/tagged/data",
      "https://medium.com/feed/daangn/tagged/search",
      "https://medium.com/feed/daangn/tagged/english",
      "https://medium.com/feed/daangn/tagged/startup",
      "https://medium.com/feed/daangn/tagged/machine-learning",
      "https://medium.com/feed/daangn/tagged/android",
      "https://medium.com/feed/daangn/tagged/ios",
      "https://medium.com/feed/daangn/tagged/backend",
      "https://medium.com/feed/daangn/tagged/frontend",
    ],
  },
  데브시스터즈: {
    type: "sitemap",
    sitemapUrl: "https://tech.devsisters.com/sitemap.xml",
    includeUrl: (url) =>
      /^https:\/\/tech\.devsisters\.com\/posts\/[^/]+\/?$/.test(url),
  },
};

function parseArgs(argv) {
  const options = {
    checkpoint: DEFAULT_CHECKPOINT,
    delayMs: DEFAULT_DELAY_MS,
    dryRun: false,
    maxItemsPerSource: 0,
    maxPagesPerSource: DEFAULT_MAX_PAGES,
    resetCheckpoint: false,
    sources: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--reset-checkpoint") options.resetCheckpoint = true;
    else if (arg.startsWith("--checkpoint="))
      options.checkpoint = path.resolve(arg.split("=")[1]);
    else if (arg.startsWith("--delay-ms="))
      options.delayMs = Number(arg.split("=")[1]);
    else if (arg.startsWith("--max-items-per-source=")) {
      options.maxItemsPerSource = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--max-pages-per-source=")) {
      options.maxPagesPerSource = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--source=")) {
      options.sources = arg
        .split("=")[1]
        .split(",")
        .map((source) => source.trim())
        .filter(Boolean);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueByUrl(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }
  return unique;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function truncateText(text, maxLength = 1000) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized || null;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

function parsePublishedAt(value, fallback = new Date().toISOString()) {
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  const text = String(value || "").trim();
  if (!text) return fallback;

  const koreanDate = text.match(
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (koreanDate) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] =
      koreanDate;
    const isoLike = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(
      2,
      "0"
    )}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}+09:00`;
    const parsed = new Date(isoLike);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function limitPayloads(payloads, options) {
  if (options.maxItemsPerSource <= 0) return payloads;
  return payloads.slice(0, options.maxItemsPerSource);
}

function hashUrl(url) {
  return createHash("sha1").update(url).digest("hex").slice(0, 8);
}

function makeSlugUnique(payload) {
  return {
    ...payload,
    slug: `${payload.slug || "item"}-${hashUrl(payload.url)}`,
  };
}

function toDbPayload(payload) {
  const dbPayload = makeSlugUnique(payload);
  delete dbPayload.rssCategories;
  return dbPayload;
}

async function loadCheckpoint(filePath, reset) {
  if (reset) return { processedUrls: {}, sources: {} };
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return { processedUrls: {}, sources: {} };
  }
}

async function saveCheckpoint(filePath, checkpoint) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(checkpoint, null, 2)}\n`);
}

async function fetchText(url, signal) {
  return fetchWithRetry(url, signal, (response) => response.text());
}

async function fetchJson(url, signal) {
  return fetchWithRetry(url, signal, (response) => response.json());
}

async function fetchWithRetry(url, signal, readResponse) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal,
        headers: { "User-Agent": "TechHub backfill/1.0" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
      return readResponse(response);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(500 * attempt);
    }
  }
  throw lastError;
}

function xmlLocs(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  return $("loc")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

async function discoverSitemapUrls(sitemapUrl, includeUrl, options, depth = 0) {
  if (depth > 2) return [];
  const xml = await fetchText(sitemapUrl, AbortSignal.timeout(20_000));
  const locs = xmlLocs(xml);
  const nested = locs.filter((loc) => /\.xml(\?.*)?$/.test(loc));
  const urls = locs.filter((loc) => includeUrl(loc));

  for (const child of nested.slice(0, options.maxPagesPerSource)) {
    await sleep(options.delayMs);
    urls.push(
      ...(await discoverSitemapUrls(child, includeUrl, options, depth + 1))
    );
  }

  return [...new Set(urls)];
}

function pageMetaToPayload({ html, url, source, fallbackDate }) {
  const $ = cheerio.load(html);
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("meta[name='twitter:title']").attr("content") ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim() ||
    url;
  const description =
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='description']").attr("content") ||
    $("meta[name='twitter:description']").attr("content") ||
    null;
  const thumbnail =
    $("meta[property='og:image']").attr("content") ||
    $("meta[name='twitter:image']").attr("content") ||
    null;
  const dateText =
    $("meta[property='article:published_time']").attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    fallbackDate ||
    null;
  const parsedDate = dateText ? new Date(dateText) : null;

  return normalizeItem(
    {
      title: stripHtml(title),
      link: url,
      pubDate:
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toISOString()
          : "",
      description: description ?? undefined,
      thumbnail: thumbnail ?? undefined,
    },
    source
  );
}

async function pageUrlsToPayloads(source, urls, options) {
  const payloads = [];
  const limitedUrls =
    options.maxItemsPerSource > 0
      ? urls.slice(0, options.maxItemsPerSource)
      : urls;

  for (const url of limitedUrls) {
    try {
      const html = await fetchText(url, AbortSignal.timeout(20_000));
      payloads.push(pageMetaToPayload({ html, url, source }));
    } catch (error) {
      console.error(
        `[warn] page failed: ${source.name} ${url} ${error.message}`
      );
    }
    await sleep(options.delayMs);
  }

  return payloads;
}

async function fetchRssPayloads(source, options) {
  const xml = await fetchText(source.feed_url, AbortSignal.timeout(20_000));
  const feed = await parser.parseString(xml);
  const items = (feed.items || []).filter((item) => item.link);
  const limited =
    options.maxItemsPerSource > 0
      ? items.slice(0, options.maxItemsPerSource)
      : items;
  return limited.map((item) => normalizeItem(item, source));
}

async function fetchWordpressPayloads(source, strategy, options) {
  const payloads = [];
  for (let page = 1; page <= options.maxPagesPerSource; page += 1) {
    const posts = await fetchJson(
      `${strategy.apiUrl}&page=${page}`,
      AbortSignal.timeout(20_000)
    );
    if (!Array.isArray(posts) || posts.length === 0) break;

    for (const post of posts) {
      payloads.push({
        url: post.link,
        slug: `woowahan-${post.id}`,
        type: "article",
        title: stripHtml(post.title?.rendered || ""),
        description: stripHtml(post.excerpt?.rendered || "") || null,
        thumbnail: null,
        source: source.name,
        language: source.default_language,
        status: "published",
        published_at: post.date
          ? new Date(post.date).toISOString()
          : new Date().toISOString(),
        rssCategories: [],
      });
    }

    if (
      options.maxItemsPerSource > 0 &&
      payloads.length >= options.maxItemsPerSource
    ) {
      return payloads.slice(0, options.maxItemsPerSource);
    }
    if (posts.length < 100) break;
    await sleep(options.delayMs);
  }
  return payloads;
}

function naverD2PostToPayload(post, source) {
  const url = absoluteUrl(post.url, "https://d2.naver.com");
  if (!url) return null;

  const thumbnail = absoluteUrl(post.postImage, url);
  return {
    url,
    slug: `naver-d2-${url.split("/").filter(Boolean).at(-1) || hashUrl(url)}`,
    type: "article",
    title: stripHtml(post.postTitle || ""),
    description: truncateText(stripHtml(post.postHtml || "")),
    thumbnail,
    source: source.name,
    language: source.default_language,
    status: "published",
    published_at: parsePublishedAt(post.postPublishedAt),
    rssCategories: [
      url.includes("/helloworld/") ? "hello world" : null,
      url.includes("/news/") ? "news" : null,
    ].filter(Boolean),
  };
}

async function fetchNaverD2Payloads(source, strategy, options) {
  const payloads = [];
  const pageSize = strategy.pageSize;

  for (let page = 0; page < options.maxPagesPerSource; page += 1) {
    const url = `${strategy.apiUrl}?page=${page}&size=${pageSize}`;
    const response = await fetchJson(url, AbortSignal.timeout(20_000));
    const posts = Array.isArray(response.content) ? response.content : [];
    if (posts.length === 0) break;

    payloads.push(
      ...posts.map((post) => naverD2PostToPayload(post, source)).filter(Boolean)
    );

    if (
      options.maxItemsPerSource > 0 &&
      payloads.length >= options.maxItemsPerSource
    ) {
      return limitPayloads(payloads, options);
    }
    if (response.page?.totalPages && page + 1 >= response.page.totalPages)
      break;
    await sleep(options.delayMs);
  }

  return limitPayloads(payloads, options);
}

function tossPostToPayload(post, source) {
  const slug = post.key || post.seoConfig?.urlSlug || String(post.id || "");
  if (!slug) return null;

  const url = `https://toss.tech/article/${slug}`;
  const categoryNames = (post.categories || [])
    .map((category) => category?.slug || category?.name)
    .filter(Boolean);

  return {
    url,
    slug: `toss-${slug}`,
    type: "article",
    title: stripHtml(post.title || ""),
    description: truncateText(
      post.subtitle ||
        post.seoConfig?.description ||
        post.openGraph?.description ||
        post.shortDescription ||
        post.fullDescription ||
        ""
    ),
    thumbnail:
      post.thumbnailConfig?.imageUrl ||
      post.coverConfig?.imageUrl ||
      post.openGraph?.imageUrl ||
      null,
    source: source.name,
    language: source.default_language,
    status: "published",
    published_at: parsePublishedAt(post.publishedTime || post.createdTime),
    rssCategories: categoryNames,
  };
}

async function fetchTossPayloads(source, strategy, options) {
  const payloads = [];
  const pageSize = strategy.pageSize;

  for (let page = 1; page <= options.maxPagesPerSource; page += 1) {
    const url = `${strategy.apiUrl}?page=${page}&size=${pageSize}`;
    const response = await fetchJson(url, AbortSignal.timeout(20_000));
    const result = response.success || response;
    const posts = Array.isArray(result.results) ? result.results : [];
    if (posts.length === 0) break;

    payloads.push(
      ...posts.map((post) => tossPostToPayload(post, source)).filter(Boolean)
    );

    if (
      options.maxItemsPerSource > 0 &&
      payloads.length >= options.maxItemsPerSource
    ) {
      return limitPayloads(payloads, options);
    }
    if (!result.next) break;
    await sleep(options.delayMs);
  }

  return limitPayloads(payloads, options);
}

function kakaoPostToPayload(post, source) {
  const id = post.id ? String(post.id) : "";
  if (!id) return null;

  const url = `https://tech.kakao.com/posts/${id}`;
  const categories = (post.categories || [])
    .flatMap((category) => [category?.code, category?.name])
    .filter(Boolean);

  return {
    url,
    slug: `kakao-${id}`,
    type: "article",
    title: stripHtml(post.title || ""),
    description: truncateText(stripHtml(post.content || "")),
    thumbnail: absoluteUrl(post.thumbnailUri, "https://tech.kakao.com"),
    source: source.name,
    language: source.default_language,
    status: "published",
    published_at: parsePublishedAt(post.releaseDateTime || post.releaseDate),
    rssCategories: categories,
  };
}

async function fetchKakaoPayloads(source, strategy, options) {
  const payloads = [];

  for (let page = 1; page <= options.maxPagesPerSource; page += 1) {
    const url = `${strategy.apiUrl}?code=${encodeURIComponent(strategy.code)}&page=${page}`;
    const response = await fetchJson(url, AbortSignal.timeout(20_000));
    const posts = Array.isArray(response.postList) ? response.postList : [];
    if (posts.length === 0) break;

    payloads.push(
      ...posts.map((post) => kakaoPostToPayload(post, source)).filter(Boolean)
    );

    if (
      options.maxItemsPerSource > 0 &&
      payloads.length >= options.maxItemsPerSource
    ) {
      return limitPayloads(payloads, options);
    }
    if (response.totalPageCount && page >= response.totalPageCount) break;
    await sleep(options.delayMs);
  }

  return limitPayloads(payloads, options);
}

async function fetchSitemapPayloads(source, strategy, options) {
  const urls = await discoverSitemapUrls(
    strategy.sitemapUrl,
    strategy.includeUrl,
    options
  );
  if (urls.length === 0) return fetchRssPayloads(source, options);
  const payloads = await pageUrlsToPayloads(source, urls, options);
  return payloads.length > 0 ? payloads : fetchRssPayloads(source, options);
}

async function fetchMediumPayloads(source, strategy, options) {
  try {
    const html = await fetchText(
      strategy.archiveUrl,
      AbortSignal.timeout(20_000)
    );
    const $ = cheerio.load(html);
    const urls = $("a[href]")
      .map(
        (_, el) =>
          new URL($(el).attr("href"), strategy.archiveUrl).href.split("?")[0]
      )
      .get()
      .filter((url) => strategy.includeUrl(url))
      .filter((url) => !url.includes("/tagged/") && !url.includes("/about"))
      .filter((url) => !/\/archive\/?$/.test(new URL(url).pathname));
    const payloads = await pageUrlsToPayloads(
      source,
      [...new Set(urls)],
      options
    );
    if (payloads.length > 0) return payloads;
  } catch (error) {
    console.error(
      `[warn] medium archive fallback: ${source.name} ${error.message}`
    );
  }
  return fetchRssPayloads(source, options);
}

async function fetchMediumRssBundlePayloads(source, strategy, options) {
  const payloads = [];
  for (const feedUrl of strategy.feedUrls) {
    try {
      const xml = await fetchText(feedUrl, AbortSignal.timeout(20_000));
      const feed = await parser.parseString(xml);
      payloads.push(
        ...(feed.items || [])
          .filter((item) => item.link)
          .map((item) => normalizeItem(item, source))
      );
    } catch (error) {
      console.error(
        `[warn] medium feed failed: ${source.name} ${feedUrl} ${error.message}`
      );
    }

    if (
      options.maxItemsPerSource > 0 &&
      uniqueByUrl(payloads).length >= options.maxItemsPerSource
    ) {
      return limitPayloads(uniqueByUrl(payloads), options);
    }
    await sleep(options.delayMs);
  }

  return limitPayloads(uniqueByUrl(payloads), options);
}

async function fetchPayloadsForSource(source, options) {
  const strategy = STRATEGIES[source.name];
  if (strategy?.type === "naver-d2-api")
    return fetchNaverD2Payloads(source, strategy, options);
  if (strategy?.type === "toss-api")
    return fetchTossPayloads(source, strategy, options);
  if (strategy?.type === "kakao-api")
    return fetchKakaoPayloads(source, strategy, options);
  if (strategy?.type === "wordpress")
    return fetchWordpressPayloads(source, strategy, options);
  if (strategy?.type === "sitemap")
    return fetchSitemapPayloads(source, strategy, options);
  if (strategy?.type === "medium-rss-bundle")
    return fetchMediumRssBundlePayloads(source, strategy, options);
  if (strategy?.type === "medium")
    return fetchMediumPayloads(source, strategy, options);
  return fetchRssPayloads(source, options);
}

function categorySlugsFor(payload) {
  return classifyCategories({
    title: payload.title || "",
    description: payload.description,
    rssCategories: payload.rssCategories,
  });
}

async function upsertPayload(db, payload, categoryIdBySlug) {
  const { data: inserted, error } = await db
    .from("content_items")
    .upsert(toDbPayload(payload), { onConflict: "url", ignoreDuplicates: true })
    .select("id,url");
  if (error) throw error;

  let row = inserted?.[0] ?? null;
  if (!row) {
    const { data: existing, error: selectError } = await db
      .from("content_items")
      .select("id,url")
      .eq("url", payload.url)
      .maybeSingle();
    if (selectError) throw selectError;
    row = existing;
  }

  const categorySlugs = categorySlugsFor(payload);
  if (row && categorySlugs.length > 0) {
    const rows = categorySlugs
      .map((slug) => {
        const categoryId = categoryIdBySlug.get(slug);
        return categoryId
          ? { content_id: row.id, category_id: categoryId }
          : null;
      })
      .filter(Boolean);
    if (rows.length > 0) {
      const { error: categoryError } = await db
        .from("content_categories")
        .upsert(rows);
      if (categoryError) throw categoryError;
    }
  }

  return { created: Boolean(inserted?.[0]), categorySlugs };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const checkpoint = await loadCheckpoint(
    options.checkpoint,
    options.resetCheckpoint
  );

  const [
    { data: sources, error: sourceError },
    { data: categories, error: categoryError },
  ] = await Promise.all([
    db
      .from("sources")
      .select("id,name,feed_url,feed_type,default_language,is_active")
      .eq("is_active", true)
      .order("id"),
    db.from("categories").select("id,slug"),
  ]);
  if (sourceError) throw sourceError;
  if (categoryError) throw categoryError;

  const categoryIdBySlug = new Map(
    (categories || []).map((category) => [category.slug, category.id])
  );
  const selectedSources = options.sources
    ? (sources || []).filter((source) => options.sources.includes(source.name))
    : sources || [];

  const totals = {
    sources: selectedSources.length,
    discovered: 0,
    processed: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    categoryLinks: 0,
  };

  for (const source of selectedSources) {
    console.log(`\n[source] ${source.name}`);
    checkpoint.sources[source.name] ??= {
      discovered: 0,
      processed: 0,
      failed: 0,
    };

    let payloads;
    try {
      payloads = uniqueByUrl(await fetchPayloadsForSource(source, options));
    } catch (error) {
      totals.failed += 1;
      checkpoint.sources[source.name].failed += 1;
      console.error(`[failed] discovery: ${source.name} ${error.message}`);
      await saveCheckpoint(options.checkpoint, checkpoint);
      continue;
    }

    totals.discovered += payloads.length;
    checkpoint.sources[source.name].discovered = payloads.length;
    console.log(`[discover] ${payloads.length} candidate items`);

    for (const payload of payloads) {
      if (checkpoint.processedUrls[payload.url]) {
        totals.skipped += 1;
        continue;
      }

      try {
        const categorySlugs = categorySlugsFor(payload);
        if (!options.dryRun) {
          const result = await upsertPayload(db, payload, categoryIdBySlug);
          if (result.created) totals.created += 1;
          else totals.skipped += 1;
          totals.categoryLinks += result.categorySlugs.length;
        }

        totals.processed += 1;
        checkpoint.sources[source.name].processed += 1;
        checkpoint.processedUrls[payload.url] = {
          source: source.name,
          title: payload.title,
          categorySlugs,
          processedAt: new Date().toISOString(),
          dryRun: options.dryRun,
        };
        console.log(
          `[item] ${options.dryRun ? "dry-run" : "ok"} ${source.name} ${categorySlugs.join(",") || "unclassified"} ${payload.title}`
        );
      } catch (error) {
        totals.failed += 1;
        checkpoint.sources[source.name].failed += 1;
        console.error(
          `[failed] item: ${source.name} ${payload.url} ${error.message}`
        );
      }

      await saveCheckpoint(options.checkpoint, checkpoint);
      await sleep(options.delayMs);
    }
  }

  console.log(`\n${JSON.stringify(totals, null, 2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
