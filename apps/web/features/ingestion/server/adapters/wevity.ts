import type { ContestTypeSlug } from "@techhub/shared";
import type { IngestionSource, ContentItemInsert } from "../parser";

const WEVITY_ORIGIN = "https://www.wevity.com";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
 * 위비티 공모전 목록 HTML을 파싱해 ContentItemInsert 배열을 반환한다.
 */
export function parseWevityList(
  html: string,
  source: IngestionSource,
  now = new Date(),
): ContentItemInsert[] {
  const items: ContentItemInsert[] = [];

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
      thumbnail: null,
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

export async function fetchWevity(
  source: IngestionSource,
  signal: AbortSignal,
): Promise<ContentItemInsert[]> {
  const response = await fetch(source.feed_url, {
    signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TechHubBot/1.0)",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return parseWevityList(html, source);
}
