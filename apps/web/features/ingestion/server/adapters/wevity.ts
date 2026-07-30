import type { ContestTypeSlug } from "@techhub/shared";
import type { IngestionSource, ContentItemInsert } from "../parser";

const WEVITY_ORIGIN = "https://www.wevity.com";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 스페셜 배너 영역의 포스터 이미지 (ix → /upload/contest/... 매핑)
const POSTER_PATTERN =
  /ix=(\d+)"[^>]*>\s*<img src="(\/upload\/contest\/[^"]+)"/g;

// 목록의 한 항목: tit 안의 anchor → organ(주최) → day(D-day) 순서로 나타난다
const ITEM_PATTERN =
  /<div class="tit">\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*(?:<div class="sub-tit">([\s\S]*?)<\/div>)?[\s\S]*?<div class="organ">([\s\S]*?)<\/div>\s*<div class="day">([\s\S]*?)<\/div>/g;

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

// 영상/디자인/마케팅류 공모전 제외 키워드
const NON_DEV_PATTERN =
  /영상|UCC|사진|디자인|웹툰|일러스트|포스터|광고|마케팅|수기|에세이|논문|작문|문학|시나리오|캐릭터|굿즈|네이밍|슬로건|미술|음악|댄스/i;

// 개발 관련 공모전 포함 키워드
const DEV_PATTERN =
  /개발|프로그래밍|프로그래머|코딩|해커톤|hackathon|소프트웨어|게임\s?잼|game\s?jam|게임제작|메이커톤|알고리즘|보안|정보보호|사이버|데이터|인공지능|아이디어|\bSW\b|\bIT\b|\bICT\b|앱|어플|로봇|드론|임베디드|IoT/i;

/**
 * 개발 관련 공모전인지 제목 키워드로 판별한다.
 * 영상/디자인류 키워드가 있으면 개발 키워드가 있어도 제외한다.
 */
export function isDevContest(title: string): boolean {
  if (NON_DEV_PATTERN.test(title)) return false;
  return DEV_PATTERN.test(title);
}

/**
 * 제목 키워드로 공모전 유형을 분류한다.
 */
export function classifyContestType(title: string): ContestTypeSlug {
  if (/해커톤|hackathon/i.test(title)) return "hackathon";
  if (/아이디어/.test(title)) return "idea-contest";
  if (/데이터|인공지능|빅데이터|머신러닝|\bAI\b|\bLLM\b/i.test(title)) {
    return "data-competition";
  }
  return "dev-contest";
}

/**
 * 목록의 D-day(D-n)를 KST 기준 해당 날짜의 23:59:59로 변환한다.
 * D-0은 오늘 마감을 의미한다.
 */
export function deadlineFromDday(days: number, now = new Date()): string {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const kstMidnightUtcMs =
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) -
    KST_OFFSET_MS;
  return new Date(kstMidnightUtcMs + (days + 1) * DAY_MS - 1000).toISOString();
}

/**
 * 접수기간 종료일(YYYY-MM-DD)을 KST 23:59:59로 변환한다.
 */
function deadlineFromDateString(date: string): string | null {
  const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const kstMidnightUtcMs =
    Date.UTC(
      parseInt(match[1]!, 10),
      parseInt(match[2]!, 10) - 1,
      parseInt(match[3]!, 10),
    ) - KST_OFFSET_MS;
  return new Date(kstMidnightUtcMs + DAY_MS - 1000).toISOString();
}

export type WevityDetail = {
  homepageUrl: string | null;
  posterUrl: string | null;
  deadline: string | null;
};

/**
 * 위비티 상세(gbn=viewok) HTML에서 원문 홈페이지, 포스터, 접수 마감일을 추출한다.
 */
export function parseWevityDetail(html: string): WevityDetail {
  const homepageMatch = html.match(
    /<span class="tit">홈페이지<\/span>\s*<a href="(https?:\/\/[^"]+)"/,
  );

  const ogImageMatch = html.match(/property="og:image" content="([^"]+)"/);
  const ogImage = ogImageMatch?.[1] ?? null;
  const posterUrl =
    ogImage && ogImage.includes("/upload/contest/") ? ogImage : null;

  const periodMatch = html.match(
    /접수기간<\/span>\s*[\d.-]+\s*~\s*(\d{4}-\d{1,2}-\d{1,2})/,
  );
  const deadline = periodMatch ? deadlineFromDateString(periodMatch[1]!) : null;

  return {
    homepageUrl: homepageMatch?.[1] ?? null,
    posterUrl,
    deadline,
  };
}

/**
 * 위비티 공모전 목록 HTML을 파싱해 ContentItemInsert 배열을 반환한다.
 */
export function parseWevityList(
  html: string,
  source: IngestionSource,
  now = new Date(),
): ContentItemInsert[] {
  const items: ContentItemInsert[] = [];

  // 포스터는 스페셜 배너로 노출된 항목만 목록에서 얻을 수 있다
  const posterMap = new Map<string, string>();
  for (const match of html.matchAll(POSTER_PATTERN)) {
    if (!posterMap.has(match[1]!)) {
      posterMap.set(match[1]!, `${WEVITY_ORIGIN}${match[2]}`);
    }
  }

  for (const match of html.matchAll(ITEM_PATTERN)) {
    const [, href, titleHtml, subTitHtml, organHtml, dayHtml] = match;

    const ixMatch = decodeEntities(href ?? "").match(/[?&]ix=(\d+)/);
    if (!ixMatch) continue;
    const ix = ixMatch[1];

    // SPECIAL/IDEA 같은 상태 배지(span)는 제목에서 제거한다
    const title = cleanText(
      (titleHtml ?? "").replace(/<span[^>]*>[\s\S]*?<\/span>/g, ""),
    );
    if (!title) continue;

    const ddayMatch = (dayHtml ?? "").match(/D-(\d+)/);
    const deadline = ddayMatch
      ? deadlineFromDday(parseInt(ddayMatch[1]!, 10), now)
      : null;

    // 위비티가 직접 붙인 IDEA 배지는 제목 키워드보다 우선한다
    const hasIdeaBadge = /class=['"]stat idea['"]/.test(titleHtml ?? "");

    // 개발 관련 공모전만 수집한다 (IDEA 배지는 IT 카테고리 내 아이디어 공모전으로 포함)
    if (NON_DEV_PATTERN.test(title)) continue;
    if (!hasIdeaBadge && !isDevContest(title)) continue;

    const organizer = cleanText(organHtml ?? "");
    const description = cleanText(subTitHtml ?? "") || null;

    items.push({
      url: `${WEVITY_ORIGIN}/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=${ix}`,
      slug: `wevity-${ix}`,
      type: "article",
      section: "contest",
      title,
      description,
      thumbnail: posterMap.get(ix!) ?? null,
      source: organizer || source.name,
      language: source.default_language,
      status: "published",
      published_at: now.toISOString(),
      deadline,
      contest_type: hasIdeaBadge ? "idea-contest" : classifyContestType(title),
    });
  }

  return items;
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TechHubBot/1.0)",
};
const DETAIL_CONCURRENCY = 5;
// 목록은 등록순이라 여러 페이지를 가져오면 예전에 등록된 접수중 공모전까지 수집된다
const DEFAULT_MAX_LIST_PAGES = 3;

/**
 * 조회할 목록 페이지 수.
 * 과거 등록분 백필 시 WEVITY_MAX_LIST_PAGES로 늘려 실행한다.
 */
function maxListPages(): number {
  const parsed = Number(process.env.WEVITY_MAX_LIST_PAGES);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_LIST_PAGES;
}

/**
 * 상세(gbn=viewok) 정보로 항목을 보강한다.
 * 원문 홈페이지를 url로, 포스터를 thumbnail로, 접수기간 종료일을 deadline으로 사용한다.
 * 상세 fetch 실패 시 목록 데이터를 그대로 유지한다.
 */
async function enrichWithDetail(
  item: ContentItemInsert,
  signal: AbortSignal,
): Promise<ContentItemInsert> {
  const ix = item.slug.match(/^wevity-(\d+)$/)?.[1];
  if (!ix) return item;

  try {
    const response = await fetch(
      `${WEVITY_ORIGIN}/?c=find&s=1&gub=1&cidx=21&gbn=viewok&ix=${ix}`,
      { signal, headers: FETCH_HEADERS },
    );
    if (!response.ok) return item;
    const detail = parseWevityDetail(await response.text());
    return {
      ...item,
      url: detail.homepageUrl ?? item.url,
      thumbnail: detail.posterUrl ?? item.thumbnail,
      deadline: detail.deadline ?? item.deadline,
    };
  } catch {
    return item;
  }
}

export async function fetchWevity(
  source: IngestionSource,
  signal: AbortSignal,
): Promise<ContentItemInsert[]> {
  const items: ContentItemInsert[] = [];
  const seenSlugs = new Set<string>();

  const totalPages = maxListPages();
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await fetch(`${source.feed_url}&gp=${page}`, {
      signal,
      headers: FETCH_HEADERS,
    });
    if (!response.ok) {
      if (page === 1) throw new Error(`HTTP ${response.status}`);
      break;
    }
    const pageItems = parseWevityList(await response.text(), source);
    const freshItems = pageItems.filter((item) => !seenSlugs.has(item.slug));
    for (const item of freshItems) seenSlugs.add(item.slug);
    items.push(...freshItems);
  }

  const enriched = new Array<ContentItemInsert>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      enriched[currentIndex] = await enrichWithDetail(items[currentIndex]!, signal);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, items.length) }, () =>
      worker(),
    ),
  );

  return enriched;
}
