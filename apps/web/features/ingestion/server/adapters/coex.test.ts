import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCoexListUrl,
  fetchCoex,
  isDevEvent,
  parseCoexList,
  parseCoexDateRange,
} from "./coex";
import type { IngestionSource } from "../parser";

const SOURCE: IngestionSource = {
  id: "src-coex",
  name: "코엑스",
  feed_url: "https://www.coex.co.kr/event/full-schedules/?list_type=LIST",
  feed_type: "coex",
  default_language: "ko",
  section: "event",
};

// 오늘(KST) 2026-10-22
const NOW = new Date("2026-10-22T02:00:00.000Z");

/** 실제 BlogPost-item 마크업을 축약한 fixture (hover 블록 + 본문 블록에 제목이 중복된다) */
function item({
  slug,
  title,
  date,
  hall = "Hall C",
  img = "https://www.coex.co.kr/wp-content/uploads/2026/07/poster.jpg",
  hover = true,
}: {
  slug: string;
  title: string;
  date: string;
  hall?: string;
  img?: string;
  hover?: boolean;
}) {
  const block = (cls: string) => `
    <div class='BlogEventItemCont${cls}'>
      <div class='BlogEventItemCont-inner'>
        <p class='BlogEventItemCont-cate pink'>Exhibition</p>
        <h4 class='BlogEventItemCont-tit'>${title}</h4>
        <div class='BlogEventItemContMeta'>
          <div class='BlogEventItemCont-date'>${date}</div>
          <div class='BlogEventItemCont-hall'>${hall}</div>
        </div>
      </div>
    </div>`;
  return `<li class='BlogPost-item'>
    <div class='BlogEventItem'>
      <a href='https://www.coex.co.kr/exhibitions/${slug}/?var_page=1&search_start_date=2026.10.22&search_end_date=2027.04.22&list_type=LIST' class='BlogEventItem-link'>
        <div class='BlogEventItemHover'>
          ${hover ? block(" asp") : ""}
          <img src='${img}' class='BlogEventItemHover-img' alt='' >
        </div>
        ${block("")}
      </a>
    </div>
  </li>`;
}

function listHtml(...items: string[]) {
  return `<ul class="BlogPost-list">${items.join("")}</ul>
    <div class="PagingList"><ul class="PagingList-list">
      <li class='PagingList-item'><span class='PagingList-link PagingList-current'>1</span></li>
    </ul></div>`;
}

const COMEUP = item({
  slug: "%ec%bb%b4%ec%97%85-2026",
  title: "컴업 2026",
  date: "2026.12.09 - 2026.12.11",
  hall: "Hall C\t",
});
const SOFTWAVE = item({
  slug: "%ec%86%8c%ed%94%84%ed%8a%b8%ec%9b%a8%ec%9d%b4%eb%b8%8c-2026",
  title: "제11회 대한민국 소프트웨어 대전, 소프트웨이브 2026",
  date: "2026.12.02 - 2026.12.04",
  hall: "Hall A",
  img: "/wp-content/themes/coex-visitor/assets/images/bg/bg-hoverExhibition.png",
  hover: false,
});
const WEDDING = item({
  slug: "%ec%9b%a8%eb%8d%b1%ec%8a%a4",
  title: "제433회 웨덱스 웨딩박람회",
  date: "2026.11.07 - 2026.11.08",
});
const STUDY_ABROAD = item({
  slug: "%ec%9c%a0%ed%95%99",
  title: "IDP 세계유학박람회",
  date: "2026.11.14 - 2026.11.15",
});

describe("parseCoexDateRange", () => {
  it("시작일 KST 00:00, 종료일 KST 23:59:59.999로 변환한다", () => {
    expect(parseCoexDateRange("2026.12.09 - 2026.12.11")).toEqual({
      start: "2026-12-08T15:00:00.000Z",
      end: "2026-12-11T14:59:59.999Z",
    });
  });

  it("하루짜리 행사도 처리한다", () => {
    expect(parseCoexDateRange("2026.12.09 - 2026.12.09")).toEqual({
      start: "2026-12-08T15:00:00.000Z",
      end: "2026-12-09T14:59:59.999Z",
    });
  });

  it("형식이 깨지면 null을 반환한다", () => {
    expect(parseCoexDateRange("미정")).toBeNull();
    expect(parseCoexDateRange("2026.13.01 - 2026.13.02")).toBeNull();
  });
});

describe("isDevEvent", () => {
  it("개발 키워드가 있으면 true", () => {
    expect(isDevEvent("AIoT 국제전시회")).toBe(true);
    expect(isDevEvent("2026 코리아 테크 페스티벌")).toBe(true);
    expect(isDevEvent("FSG Korea 기능안전 컨퍼런스 2026")).toBe(true);
    expect(isDevEvent("컴업 2026")).toBe(true);
  });

  it("제외 패턴이 있으면 개발 키워드가 있어도 false", () => {
    expect(isDevEvent("2026 글로벌 푸드테크 기술 표준화 심포지엄")).toBe(false);
    expect(isDevEvent("월드 웹툰 페스티벌 AI")).toBe(false);
  });

  it("컨퍼런스 단독으로는 포함하지 않는다", () => {
    expect(isDevEvent("대학내일ES 트렌드 컨퍼런스 2027")).toBe(false);
    expect(isDevEvent("제15회 월드커피포럼 2026")).toBe(false);
  });

  it("영문 키워드는 단어 경계로만 매칭한다", () => {
    expect(isDevEvent("Coex On Stage X ifeye")).toBe(false);
    expect(isDevEvent("서울국제발명전시회")).toBe(false);
  });
});

describe("parseCoexList", () => {
  it("항목 단위로 파싱해 hover 중복 없이 행사당 한 행만 만든다", () => {
    const result = parseCoexList(listHtml(COMEUP), SOURCE, NOW);

    expect(result).toHaveLength(1);
    const event = result[0]!;
    expect(event.title).toBe("컴업 2026");
    expect(event.section).toBe("event");
    expect(event.type).toBe("article");
    expect(event.status).toBe("published");
    expect(event.language).toBe("ko");
    expect(event.source).toBe("코엑스");
    expect(event.contest_type).toBeNull();
  });

  it("url은 query를 제거한 정규 URL, slug는 coex- 접두 + 디코딩된 slug", () => {
    const event = parseCoexList(listHtml(COMEUP), SOURCE, NOW)[0]!;

    expect(event.url).toBe("https://www.coex.co.kr/exhibitions/%ec%bb%b4%ec%97%85-2026/");
    expect(event.slug).toBe("coex-컴업-2026");
  });

  it("시작일을 published_at, 종료일을 deadline으로 넣는다", () => {
    const event = parseCoexList(listHtml(COMEUP), SOURCE, NOW)[0]!;

    expect(event.published_at).toBe("2026-12-08T15:00:00.000Z");
    expect(event.deadline).toBe("2026-12-11T14:59:59.999Z");
  });

  it("장소를 설명으로 쓰고 끝 공백(탭)을 제거한다", () => {
    expect(parseCoexList(listHtml(COMEUP), SOURCE, NOW)[0]!.description).toBe(
      "코엑스 Hall C",
    );
  });

  it("절대 URL 썸네일은 그대로, 테마 기본 이미지는 null", () => {
    const result = parseCoexList(listHtml(COMEUP, SOFTWAVE), SOURCE, NOW);

    expect(result[0]!.thumbnail).toBe(
      "https://www.coex.co.kr/wp-content/uploads/2026/07/poster.jpg",
    );
    expect(result[1]!.title).toBe("제11회 대한민국 소프트웨어 대전, 소프트웨이브 2026");
    expect(result[1]!.thumbnail).toBeNull();
  });

  it("카테고리별 테마 기본 이미지도 null이다", () => {
    const html = listHtml(
      item({
        slug: "fsg",
        title: "FSG 기능안전 컨퍼런스",
        date: "2026.11.01 - 2026.11.02",
        img: "https://www.coex.co.kr/wp-content/themes/coex-visitor/assets/images/bg/bg-hoverEvent.png",
      }),
    );

    expect(parseCoexList(html, SOURCE, NOW)[0]!.thumbnail).toBeNull();
  });

  it("상대 경로 썸네일은 절대 URL로 만든다", () => {
    const html = listHtml(
      item({
        slug: "ai-expo",
        title: "AI 엑스포",
        date: "2026.11.01 - 2026.11.02",
        img: "/wp-content/uploads/2026/08/ai.jpg",
      }),
    );

    expect(parseCoexList(html, SOURCE, NOW)[0]!.thumbnail).toBe(
      "https://www.coex.co.kr/wp-content/uploads/2026/08/ai.jpg",
    );
  });

  it("개발과 무관한 행사는 제외한다", () => {
    const result = parseCoexList(
      listHtml(WEDDING, STUDY_ABROAD, COMEUP, SOFTWAVE),
      SOURCE,
      NOW,
    );

    expect(result.map((e) => e.title)).toEqual([
      "컴업 2026",
      "제11회 대한민국 소프트웨어 대전, 소프트웨이브 2026",
    ]);
  });

  it("이미 종료된 행사는 제외한다", () => {
    const html = listHtml(
      item({ slug: "old-ai", title: "AI 서밋", date: "2026.10.01 - 2026.10.03" }),
    );

    expect(parseCoexList(html, SOURCE, NOW)).toEqual([]);
  });

  it("날짜를 읽지 못한 항목은 건너뛴다", () => {
    const html = listHtml(item({ slug: "ai", title: "AI 서밋", date: "추후 공지" }));

    expect(parseCoexList(html, SOURCE, NOW)).toEqual([]);
  });

  it("항목이 없으면 빈 배열을 반환한다", () => {
    expect(parseCoexList("<html></html>", SOURCE, NOW)).toEqual([]);
  });
});

describe("buildCoexListUrl", () => {
  it("오늘(KST)부터 +90일까지 기간과 페이지를 붙인다", () => {
    const url = new URL(buildCoexListUrl(SOURCE.feed_url, NOW, 3));

    expect(url.searchParams.get("list_type")).toBe("LIST");
    expect(url.searchParams.get("var_page")).toBe("3");
    expect(url.searchParams.get("search_start_date")).toBe("2026.10.22");
    expect(url.searchParams.get("search_end_date")).toBe("2027.01.20");
  });

  it("UTC 날짜와 KST 날짜가 다른 시각도 KST 기준으로 계산한다", () => {
    // 2026-10-22T20:00Z == 2026-10-23 KST 05:00
    const url = new URL(
      buildCoexListUrl(SOURCE.feed_url, new Date("2026-10-22T20:00:00.000Z"), 1),
    );

    expect(url.searchParams.get("search_start_date")).toBe("2026.10.23");
  });
});

describe("fetchCoex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  function stubPages(pages: Array<string | { status: number }>) {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        const page = pages[Math.min(call, pages.length - 1)]!;
        call += 1;
        if (typeof page !== "string") return { ok: false, status: page.status };
        return { ok: true, status: 200, text: async () => page };
      }),
    );
  }

  // fetchCoex는 현재 시각을 쓰므로 미래 행사 fixture가 필요하다
  const FUTURE = item({
    slug: "ai-future",
    title: "AI 미래 포럼",
    date: "2099.01.01 - 2099.01.02",
  });

  it("정상 응답이면 ContentItemInsert 배열을 반환한다", async () => {
    stubPages([listHtml(FUTURE), listHtml()]);

    const result = await fetchCoex(SOURCE, new AbortController().signal);
    expect(result).toHaveLength(1);
    expect(result[0]!.section).toBe("event");
  });

  it("항목이 없는 페이지를 만나면 조회를 멈춘다", async () => {
    stubPages([listHtml(FUTURE), "<html></html>"]);
    await fetchCoex(SOURCE, new AbortController().signal);

    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
  });

  it("개발 행사가 없는 페이지라도 항목이 있으면 다음 페이지를 조회한다", async () => {
    stubPages([listHtml(WEDDING), listHtml(FUTURE), "<html></html>"]);
    const result = await fetchCoex(SOURCE, new AbortController().signal);

    expect(result).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(3);
  });

  it("기본 최대 8페이지, COEX_MAX_LIST_PAGES로 조절한다", async () => {
    stubPages([listHtml(WEDDING)]);
    await fetchCoex(SOURCE, new AbortController().signal);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(8);

    vi.clearAllMocks();
    vi.stubEnv("COEX_MAX_LIST_PAGES", "3");
    stubPages([listHtml(WEDDING)]);
    await fetchCoex(SOURCE, new AbortController().signal);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(3);
  });

  it("페이지 간 중복 slug는 한 번만 담는다", async () => {
    stubPages([listHtml(FUTURE), listHtml(FUTURE), "<html></html>"]);

    expect(await fetchCoex(SOURCE, new AbortController().signal)).toHaveLength(1);
  });

  it("첫 페이지가 실패하면 예외를 던진다", async () => {
    stubPages([{ status: 403 }]);

    await expect(fetchCoex(SOURCE, new AbortController().signal)).rejects.toThrow(
      "HTTP 403",
    );
  });

  it("두 번째 페이지가 실패하면 첫 페이지 결과를 유지한다", async () => {
    stubPages([listHtml(FUTURE), { status: 500 }]);

    expect(await fetchCoex(SOURCE, new AbortController().signal)).toHaveLength(1);
  });
});
