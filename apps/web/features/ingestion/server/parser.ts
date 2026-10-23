import Parser from "rss-parser";

export type FeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  // Atom <author><name>
  author?: string;
  description?: string;
  // rss-parser default: <description> → content + contentSnippet
  content?: string;
  contentSnippet?: string;
  // <content:encoded> namespace
  "content:encoded"?: string;
  "content:encodedSnippet"?: string;
  // Atom <summary>
  summary?: string;
  enclosure?: { url?: string };
  "media:content"?: { $?: { url?: string } };
  // 카카오 테크 전용 <thumbnail> 태그
  thumbnail?: string;
  // rss-parser가 <category> 태그를 자동으로 파싱해주는 필드
  categories?: string[];
};

export type IngestionSource = {
  id: string | number;
  name: string;
  feed_url: string;
  feed_type: "rss" | "atom" | "wevity" | "contestkorea";
  default_language: "ko" | "en";
  section?: "article" | "news" | "contest";
};

export type ContentItemInsert = {
  url: string;
  slug: string;
  type: "article";
  section: "article" | "news" | "contest";
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  source: string;
  language: "ko" | "en";
  status: "published";
  published_at: string;
  // 공모전 전용: 접수 마감일 (NULL이면 상시)
  deadline?: string | null;
  // 공모전 전용: 유형 slug
  contest_type?: string | null;
  // DB 컬럼 아님 — 분류 시 가중치 점수에 사용되는 RSS <category> 원본값
  rssCategories?: string[];
};

const parser = new Parser<Record<string, unknown>, FeedItem>({
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["enclosure", "enclosure"],
      ["description", "description"],
      ["thumbnail", "thumbnail"],
    ],
  },
});

/**
 * RSS/Atom XML 문자열을 파싱해 FeedItem 배열을 반환한다.
 * 잘못된 XML이면 빈 배열을 반환한다.
 */
export async function parseRssFeed(xml: string): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseString(xml);
    return feed.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Medium 트래킹 파라미터를 제거한다.
 * ?source=rss 로 시작하는 쿼리 스트링 전체를 제거한다.
 */
function stripMediumTracking(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("source") && parsed.searchParams.get("source")?.startsWith("rss")) {
      return parsed.origin + parsed.pathname;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * URL에서 마지막 path segment를 추출해 slug로 사용한다.
 * trailing slash를 제거한 뒤 추출한다.
 */
function slugFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const idParam = parsed.searchParams.get("id");
    if (idParam) {
      return `${last}-${idParam}`.replace(/[^a-zA-Z0-9-]/g, "-");
    }
    // Medium URL: 마지막 segment에 ?source=rss 파라미터가 붙어있을 수 있음 → 제거
    return last.split("?")[0] ?? last;
  } catch {
    return url.replace(/[^a-zA-Z0-9-]/g, "-");
  }
}

/**
 * HTML 태그를 제거하고 텍스트만 반환한다.
 * HTML 엔티티(&lt; 등)를 디코딩한 뒤 태그를 제거한다.
 */
function stripHtml(html: string): string {
  // HTML 엔티티 디코딩 (기본적인 것만)
  const decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // 태그 제거
  return decoded.replace(/<[^>]*>/g, "");
}

/**
 * description에서 첫 번째 img src를 추출한다.
 */
function extractThumbnail(description: string): string | null {
  const match = description.match(/<img[^>]+src=['"]([^'"]+)['"]/i);
  return match?.[1] ?? null;
}

/**
 * FeedItem + IngestionSource → content_items INSERT payload
 */
export function normalizeItem(item: FeedItem, source: IngestionSource): ContentItemInsert {
  const cleanUrl = stripMediumTracking(item.link ?? "");
  const slug = slugFromUrl(cleanUrl);

  // 텍스트 설명: 이미 HTML이 제거된 필드를 우선, 없으면 HTML에서 직접 추출
  const plainText =
    item["content:encodedSnippet"] ??
    item.contentSnippet ??
    item.summary ??
    null;
  const rawHtml = item["content:encoded"] ?? item.content ?? item.description ?? null;
  const description =
    plainText?.trim() ||
    (rawHtml ? stripHtml(rawHtml).trim() || null : null);

  const mediaUrl = item["media:content"]?.$?.url ?? item.enclosure?.url ?? item.thumbnail ?? null;
  let thumbnail = mediaUrl ?? (rawHtml ? extractThumbnail(rawHtml) ?? null : null);

  // 상대경로 썸네일을 절대경로로 변환
  if (thumbnail && !thumbnail.startsWith("http")) {
    try {
      thumbnail = new URL(thumbnail, cleanUrl).href;
    } catch {
      thumbnail = null;
    }
  }

  let publishedAt: string;
  if (item.pubDate && item.pubDate.trim() !== "") {
    const parsed = new Date(item.pubDate);
    publishedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } else {
    publishedAt = new Date().toISOString();
  }

  return {
    url: cleanUrl,
    slug,
    type: "article",
    section: source.section ?? "article",
    title: item.title ?? null,
    description,
    thumbnail,
    source: source.name,
    language: source.default_language,
    status: "published",
    published_at: publishedAt,
    rssCategories: item.categories?.filter(Boolean) ?? [],
  };
}
