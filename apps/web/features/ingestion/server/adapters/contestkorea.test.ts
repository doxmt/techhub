import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parseContestKoreaList,
  parseHost,
  fetchContestKorea,
} from "./contestkorea";
import type { IngestionSource } from "../parser";

const SOURCE: IngestionSource = {
  id: "src-ck",
  name: "콘테스트코리아",
  feed_url:
    "https://www.contestkorea.com/sub/list.php?displayrow=48&int_gbn=1&Txt_bcode=030310001",
  feed_type: "contestkorea",
  default_language: "ko",
  section: "contest",
};

/** 실제 list_style_2 마크업을 그대로 축약한 fixture */
function item({
  strNo,
  title,
  host = "한국지능정보사회진흥원",
  dday = "D-24",
}: {
  strNo: string;
  title: string;
  host?: string;
  dday?: string;
}) {
  return `
    <li class="imminent">
      <div class="title">
        <a href="view.php?int_gbn=1&Txt_bcode=030310001&str_no=${strNo}">
          <span class="category">학문•과학•IT</span>
          <img src='/pub/img/board/ic_new.gif' align='absMiddle'>
          <span class="txt">${title}</span>
        </a>
        <span class="icon_like" val="${strNo}">0</span>
      </div>
      <ul class="host">
        <li class="icon_1"><strong>주최</strong> . ${host}</li>
        <li class="icon_2"><strong>대상</strong> . 누구나 , 대학생</li>
      </ul>
      <div class="date">
        <div class="date-detail"><span class="step-1"><em>접수</em> 07.21~08.23 </span></div>
      </div>
      <div class="d-day orange">
        <span class="day">${dday}</span>
        <span class="condition">접수중</span>
      </div>
    </li>`;
}

function listHtml(...items: string[]) {
  return `<div class="list_style_2"><ul>${items.join("")}</ul></div>`;
}

const DEV_ITEM = item({
  strNo: "202607210057",
  title: "제5회 인공지능 개발 공모전",
});

// D-day 기준이라 시간 고정이 필요하다
const NOW = new Date("2026-07-30T02:00:00.000Z");

describe("parseHost", () => {
  it("주최 기관명을 뽑는다", () => {
    const html = `<li class="icon_1"><strong>주최</strong> . 서울특별시, (주)동그람이</li>
                  <li class="icon_2"><strong>대상</strong> . 누구나</li>`;
    expect(parseHost(html)).toBe("서울특별시, (주)동그람이");
  });

  it("대상 항목을 주최로 착각하지 않는다", () => {
    const html = `<li class="icon_2"><strong>대상</strong> . 누구나 , 대학생</li>`;
    expect(parseHost(html)).toBeNull();
  });

  it("주최가 비어 있으면 null을 반환한다", () => {
    expect(parseHost(`<li><strong>주최</strong> . </li>`)).toBeNull();
  });
});

describe("parseContestKoreaList", () => {
  it("목록 항목을 ContentItemInsert로 변환한다", () => {
    const result = parseContestKoreaList(listHtml(DEV_ITEM), SOURCE, NOW);

    expect(result).toHaveLength(1);
    const contest = result[0]!;
    expect(contest.title).toBe("제5회 인공지능 개발 공모전");
    expect(contest.section).toBe("contest");
    expect(contest.type).toBe("article");
    expect(contest.status).toBe("published");
    expect(contest.language).toBe("ko");
  });

  it("str_no 기준으로 slug와 정규화된 url을 만든다", () => {
    const result = parseContestKoreaList(listHtml(DEV_ITEM), SOURCE, NOW);

    expect(result[0]!.slug).toBe("contestkorea-202607210057");
    expect(result[0]!.url).toBe(
      "https://www.contestkorea.com/sub/view.php?str_no=202607210057",
    );
  });

  it("D-day로 마감일을 만든다", () => {
    const result = parseContestKoreaList(listHtml(DEV_ITEM), SOURCE, NOW);

    // 2026-07-30 KST 기준 D-24 → 2026-08-23 KST 23:59:59
    expect(result[0]!.deadline).toBe("2026-08-23T14:59:59.000Z");
  });

  it("D-day가 없는 항목은 수집하지 않는다", () => {
    // 접수예정·심사중·마감 항목. 상시(deadline=null)로 두면 진행중으로 잘못 노출된다
    const html = listHtml(
      item({ strNo: "1", title: "개발 공모전", dday: "마감" }),
      item({ strNo: "2", title: "소프트웨어 개발 공모전", dday: "예정" }),
    );

    expect(parseContestKoreaList(html, SOURCE, NOW)).toHaveLength(0);
  });

  it("주최기관을 source로 쓴다", () => {
    const html = listHtml(
      item({ strNo: "2", title: "소프트웨어 개발 공모전", host: "과학기술정보통신부" }),
    );

    expect(parseContestKoreaList(html, SOURCE, NOW)[0]!.source).toBe(
      "과학기술정보통신부",
    );
  });

  it("주최기관이 없으면 소스 이름으로 폴백한다", () => {
    const html = listHtml(
      item({ strNo: "3", title: "소프트웨어 개발 공모전", host: "" }),
    );

    expect(parseContestKoreaList(html, SOURCE, NOW)[0]!.source).toBe(
      "콘테스트코리아",
    );
  });

  it("목록에 썸네일이 없으므로 null이다 (OG 폴백에 맡긴다)", () => {
    expect(parseContestKoreaList(listHtml(DEV_ITEM), SOURCE, NOW)[0]!.thumbnail)
      .toBeNull();
  });

  it("개발과 무관한 공모전은 제외한다", () => {
    const html = listHtml(
      item({ strNo: "10", title: "2026 GSA 영어 말하기 대회" }),
      item({ strNo: "11", title: "제2회 사진 공모전" }),
      DEV_ITEM,
    );

    const result = parseContestKoreaList(html, SOURCE, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.slug).toBe("contestkorea-202607210057");
  });

  it("디자인 키워드가 있으면 개발 키워드가 있어도 제외한다", () => {
    const html = listHtml(item({ strNo: "12", title: "앱 디자인 공모전" }));

    expect(parseContestKoreaList(html, SOURCE, NOW)).toHaveLength(0);
  });

  it("제목으로 공모전 유형을 분류한다", () => {
    const html = listHtml(
      item({ strNo: "20", title: "2026 오픈소스 해커톤" }),
      item({ strNo: "21", title: "빅데이터 분석 경진대회" }),
      item({ strNo: "22", title: "소프트웨어 개발 공모전" }),
    );

    const byslug = Object.fromEntries(
      parseContestKoreaList(html, SOURCE, NOW).map((c) => [c.slug, c.contest_type]),
    );
    expect(byslug["contestkorea-20"]).toBe("hackathon");
    expect(byslug["contestkorea-21"]).toBe("data-competition");
    expect(byslug["contestkorea-22"]).toBe("dev-contest");
  });

  it("항목이 없으면 빈 배열을 반환한다", () => {
    expect(parseContestKoreaList("<html></html>", SOURCE, NOW)).toEqual([]);
  });
});

describe("fetchContestKorea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  function stubFetch(html: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => html }),
    );
  }

  it("정상 응답이면 ContentItemInsert 배열을 반환한다", async () => {
    stubFetch(listHtml(DEV_ITEM));

    const result = await fetchContestKorea(SOURCE, new AbortController().signal);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.section).toBe("contest");
  });

  it("기본으로 목록 2페이지를 조회한다", async () => {
    stubFetch(listHtml(DEV_ITEM));
    await fetchContestKorea(SOURCE, new AbortController().signal);

    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
  });

  it("CONTESTKOREA_MAX_LIST_PAGES로 페이지 수를 조절한다", async () => {
    vi.stubEnv("CONTESTKOREA_MAX_LIST_PAGES", "5");
    stubFetch(listHtml(DEV_ITEM));
    await fetchContestKorea(SOURCE, new AbortController().signal);

    expect(vi.mocked(fetch).mock.calls).toHaveLength(5);
  });

  it("페이지 간 중복 str_no는 한 번만 담는다", async () => {
    stubFetch(listHtml(DEV_ITEM));

    const result = await fetchContestKorea(SOURCE, new AbortController().signal);
    expect(result).toHaveLength(1);
  });

  it("첫 페이지가 실패하면 예외를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(
      fetchContestKorea(SOURCE, new AbortController().signal),
    ).rejects.toThrow("HTTP 403");
  });

  it("두 번째 페이지가 실패하면 첫 페이지 결과를 유지한다", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        call += 1;
        if (call === 1)
          return { ok: true, status: 200, text: async () => listHtml(DEV_ITEM) };
        return { ok: false, status: 500 };
      }),
    );

    const result = await fetchContestKorea(SOURCE, new AbortController().signal);
    expect(result).toHaveLength(1);
  });
});
