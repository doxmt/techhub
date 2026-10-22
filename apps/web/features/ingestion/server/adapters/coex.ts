import { createSlug } from "@techhub/shared";
import type { IngestionSource, ContentItemInsert } from "../parser";

const ORIGIN = "https://www.coex.co.kr";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TechHubBot/1.0)",
};

const DEFAULT_MAX_LIST_PAGES = 8;
// 오늘(KST)부터 이 기간 안에 열리는 행사만 조회한다
const LOOKAHEAD_DAYS = 90;
// 썸네일이 없는 항목이 쓰는 테마 기본 이미지
// (bg-hoverExhibition / bg-hoverConvention / bg-hoverEvent ...)
const PLACEHOLDER_THUMBNAIL = "/assets/images/bg/bg-hover";

// 개발 관련 행사 판별 키워드. 오탐·누락은 운영하며 보정한다.
// 영문 약어는 다른 단어에 섞여 오탐되지 않도록 단어 경계로만 매칭한다.
const DEV_PATTERN = new RegExp(
  [
    "(?<![A-Za-z])(AI|AIoT|IoT|IT|SW|SaaS|DevOps|Tech|COMEUP)(?![A-Za-z])",
    "인공지능|소프트웨어|소프트웨이브|개발자|테크|클라우드|데이터|보안|사이버",
    "로봇|블록체인|메타버스|디지털|컴업|반도체|임베디드|기능안전|오픈소스|게임",
  ].join("|"),
  "i",
);

const NON_DEV_PATTERN =
  /유학|웨딩|베이비|푸드|식품|치과|의료|뷰티|미용|카페|커피|인테리어|건축|웹툰|입학/;

// 항목 한 개. hover 블록과 본문 블록이 제목을 중복으로 담아 항목 단위로 파싱한다
const ITEM_PATTERN = /<li class='BlogPost-item'>([\s\S]*?)<\/li>/g;
const LINK_PATTERN = /<a href='([^']+)' class='BlogEventItem-link'>/;
const TITLE_PATTERN = /<h4 class='BlogEventItemCont-tit'>([\s\S]*?)<\/h4>/;
const DATE_PATTERN = /<div class='BlogEventItemCont-date'>([\s\S]*?)<\/div>/;
const HALL_PATTERN = /<div class='BlogEventItemCont-hall'>([\s\S]*?)<\/div>/;
const IMG_PATTERN = /<img src='([^']*)' class='BlogEventItemHover-img'/;

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function cleanText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function maxListPages(): number {
  const parsed = Number(process.env.COEX_MAX_LIST_PAGES);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_LIST_PAGES;
}

/** 제목 키워드로 개발 관련 행사인지 판별한다. */
export function isDevEvent(title: string): boolean {
  if (NON_DEV_PATTERN.test(title)) return false;
  return DEV_PATTERN.test(title);
}

function kstDayStartUtcMs(year: number, month: number, day: number): number | null {
  const utcMs = Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
  const check = new Date(utcMs + KST_OFFSET_MS);
  // 존재하지 않는 날짜(예: 13월, 02-31)는 걸러낸다
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return utcMs;
}

/**
 * "2026.12.09 - 2026.12.11" (KST)을 시작일 00:00 ~ 종료일 23:59:59.999의 ISO 문자열로 바꾼다.
 */
export function parseCoexDateRange(
  text: string,
): { start: string; end: string } | null {
  const match = text.match(
    /(\d{4})\.(\d{2})\.(\d{2})\s*-\s*(\d{4})\.(\d{2})\.(\d{2})/,
  );
  if (!match) return null;

  const [, y1, m1, d1, y2, m2, d2] = match.map(Number) as number[];
  const startMs = kstDayStartUtcMs(y1!, m1!, d1!);
  const endDayMs = kstDayStartUtcMs(y2!, m2!, d2!);
  if (startMs === null || endDayMs === null) return null;

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endDayMs + DAY_MS - 1).toISOString(),
  };
}

function normalizeThumbnail(src: string | undefined): string | null {
  if (!src || src.includes(PLACEHOLDER_THUMBNAIL)) return null;
  if (/^https?:\/\//.test(src)) return src;
  return src.startsWith("/") ? `${ORIGIN}${src}` : null;
}

/** 목록 항목(`BlogPost-item`) 개수. 페이지 끝 판별에 쓴다. */
function countListItems(html: string): number {
  return Array.from(html.matchAll(ITEM_PATTERN)).length;
}

/**
 * 코엑스 일정 목록 HTML을 파싱해 ContentItemInsert 배열을 반환한다.
 * 개발과 무관한 행사와 이미 종료된 행사는 걸러낸다.
 */
export function parseCoexList(
  html: string,
  source: IngestionSource,
  now = new Date(),
): ContentItemInsert[] {
  const items: ContentItemInsert[] = [];

  for (const match of html.matchAll(ITEM_PATTERN)) {
    const block = match[1] ?? "";

    const href = block.match(LINK_PATTERN)?.[1];
    const title = cleanText(block.match(TITLE_PATTERN)?.[1] ?? "");
    if (!href || !title) continue;
    if (!isDevEvent(title)) continue;

    const range = parseCoexDateRange(cleanText(block.match(DATE_PATTERN)?.[1] ?? ""));
    if (!range) continue;
    if (new Date(range.end).getTime() < now.getTime()) continue;

    // 목록 링크의 페이지/기간 query는 버리고 상세 페이지 정규 URL만 쓴다
    const url = href.split("?")[0]!;
    const wpSlug = url.split("/").filter(Boolean).pop() ?? "";
    let decodedSlug = wpSlug;
    try {
      decodedSlug = decodeURIComponent(wpSlug);
    } catch {
      // 디코딩 실패 시 원문 slug를 그대로 쓴다
    }

    const hall = cleanText(block.match(HALL_PATTERN)?.[1] ?? "");

    items.push({
      url,
      slug: `coex-${createSlug(decodedSlug)}`,
      type: "article",
      section: "event",
      title,
      description: hall ? `코엑스 ${hall}` : null,
      thumbnail: normalizeThumbnail(block.match(IMG_PATTERN)?.[1]),
      source: source.name,
      language: source.default_language,
      status: "published",
      // 행사 시작일. 피드는 시작일 오름차순으로 정렬한다
      published_at: range.start,
      deadline: range.end,
      contest_type: null,
    });
  }

  return items;
}

function formatKstDate(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/** 오늘(KST) ~ +90일 범위와 페이지 번호를 붙인 목록 URL을 만든다. */
export function buildCoexListUrl(feedUrl: string, now: Date, page: number): string {
  const url = new URL(feedUrl);
  url.searchParams.set("var_page", String(page));
  url.searchParams.set("search_start_date", formatKstDate(now));
  url.searchParams.set(
    "search_end_date",
    formatKstDate(new Date(now.getTime() + LOOKAHEAD_DAYS * DAY_MS)),
  );
  return url.toString();
}

export async function fetchCoex(
  source: IngestionSource,
  signal: AbortSignal,
): Promise<ContentItemInsert[]> {
  const items: ContentItemInsert[] = [];
  const seenSlugs = new Set<string>();
  const totalPages = maxListPages();
  const now = new Date();

  for (let page = 1; page <= totalPages; page += 1) {
    const response = await fetch(buildCoexListUrl(source.feed_url, now, page), {
      signal,
      headers: FETCH_HEADERS,
    });
    if (!response.ok) {
      if (page === 1) throw new Error(`HTTP ${response.status}`);
      break;
    }

    const html = await response.text();
    // 항목이 없는 페이지가 마지막이다 (개발 행사가 없는 페이지와 구분하려고 원본 개수로 판단)
    if (countListItems(html) === 0) break;

    for (const item of parseCoexList(html, source, now)) {
      if (seenSlugs.has(item.slug)) continue;
      seenSlugs.add(item.slug);
      items.push(item);
    }
  }

  return items;
}
