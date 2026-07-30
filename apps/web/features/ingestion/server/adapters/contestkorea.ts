import type { IngestionSource, ContentItemInsert } from "../parser";
// 개발 공모전 판별·유형 분류·D-day 변환은 출처와 무관한 공통 규칙이라 재사용한다
import {
  isDevContest,
  classifyContestType,
  deadlineFromDday,
  NON_DEV_PATTERN,
} from "./wevity";

const ORIGIN = "https://www.contestkorea.com";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TechHubBot/1.0)",
};

const DEFAULT_MAX_LIST_PAGES = 2;

/**
 * 목록(list_style_2) 한 항목.
 * title > a[str_no] > span.txt(제목), ul.host(주최), div.d-day > span.day(D-day) 순서로 나타난다.
 */
const ITEM_PATTERN =
  /<div class="title">\s*<a href="[^"]*str_no=(\d+)"[\s\S]*?<span class="txt">([\s\S]*?)<\/span>[\s\S]*?<ul class="host">([\s\S]*?)<\/ul>[\s\S]*?<div class="d-day[^"]*">\s*<span class="day">([\s\S]*?)<\/span>/g;

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function cleanText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 조회할 목록 페이지 수. 백필 시 CONTESTKOREA_MAX_LIST_PAGES로 늘려 실행한다.
 */
function maxListPages(): number {
  const parsed = Number(process.env.CONTESTKOREA_MAX_LIST_PAGES);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_LIST_PAGES;
}

/**
 * `str_no` 앞 8자리(YYYYMMDD)를 공고 등록일로 해석한다.
 * 피드 정렬과 카드의 등록일 표시가 수집 시각이 아니라 공고 등록일 기준이 되도록 한다.
 * 형식이 깨지면 null을 반환해 호출부가 수집 시각으로 폴백한다.
 */
export function publishedAtFromStrNo(strNo: string): string | null {
  const match = strNo.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1]!, 10);
  const month = parseInt(match[2]!, 10);
  const day = parseInt(match[3]!, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // KST 자정 기준
  const utcMs = Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
  const date = new Date(utcMs);
  // 존재하지 않는 날짜(예: 02-31)는 걸러낸다
  if (date.getUTCMonth() !== (month - 1 + 12) % 12) return null;
  return date.toISOString();
}

/**
 * `<ul class="host">`에서 주최 기관명을 뽑는다.
 * 목록에는 주최·대상이 함께 들어 있어 주최 항목만 골라낸다.
 */
export function parseHost(hostHtml: string): string | null {
  const match = hostHtml.match(/<strong>주최<\/strong>\s*\.?\s*([\s\S]*?)<\/li>/);
  if (!match) return null;
  return cleanText(match[1] ?? "") || null;
}

/**
 * 콘테스트코리아 목록 HTML을 파싱해 ContentItemInsert 배열을 반환한다.
 * 개발과 무관한 공모전은 제목 키워드로 걸러낸다.
 */
export function parseContestKoreaList(
  html: string,
  source: IngestionSource,
  now = new Date(),
): ContentItemInsert[] {
  const items: ContentItemInsert[] = [];

  for (const match of html.matchAll(ITEM_PATTERN)) {
    const [, strNo, titleHtml, hostHtml, dayHtml] = match;
    if (!strNo) continue;

    const title = cleanText(titleHtml ?? "");
    if (!title) continue;

    if (NON_DEV_PATTERN.test(title)) continue;
    if (!isDevContest(title)) continue;

    // 목록의 접수 종료일에는 연도가 없어 D-day로 마감일을 만든다.
    // 접수예정·심사중·마감 항목은 D-day가 없는데, 이를 deadline=null(상시)로 두면
    // 진행중으로 잘못 노출되므로 아예 수집하지 않는다.
    const ddayMatch = (dayHtml ?? "").match(/D-(\d+)/);
    if (!ddayMatch) continue;
    const deadline = deadlineFromDday(parseInt(ddayMatch[1]!, 10), now);

    items.push({
      // 목록 링크의 정렬/검색 query는 버리고 str_no만 남긴 정규 URL을 쓴다
      url: `${ORIGIN}/sub/view.php?str_no=${strNo}`,
      slug: `contestkorea-${strNo}`,
      type: "article",
      section: "contest",
      title,
      description: null,
      // 목록에 썸네일이 없어 수집 단계의 OG 이미지 폴백에 맡긴다
      thumbnail: null,
      source: parseHost(hostHtml ?? "") ?? source.name,
      language: source.default_language,
      status: "published",
      // 공고 등록일(str_no 앞 8자리). 파싱 실패 시에만 수집 시각으로 폴백한다
      published_at: publishedAtFromStrNo(strNo) ?? now.toISOString(),
      deadline,
      contest_type: classifyContestType(title),
    });
  }

  return items;
}

export async function fetchContestKorea(
  source: IngestionSource,
  signal: AbortSignal,
): Promise<ContentItemInsert[]> {
  const items: ContentItemInsert[] = [];
  const seenSlugs = new Set<string>();
  const totalPages = maxListPages();

  for (let page = 1; page <= totalPages; page += 1) {
    const response = await fetch(`${source.feed_url}&page=${page}`, {
      signal,
      headers: FETCH_HEADERS,
    });
    if (!response.ok) {
      if (page === 1) throw new Error(`HTTP ${response.status}`);
      break;
    }

    for (const item of parseContestKoreaList(await response.text(), source)) {
      if (seenSlugs.has(item.slug)) continue;
      seenSlugs.add(item.slug);
      items.push(item);
    }
  }

  return items;
}
