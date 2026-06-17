import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchWevity,
  parseWevityList,
  parseWevityDetail,
  classifyContestType,
  deadlineFromDday,
  isDevContest,
} from "./wevity";

const SOURCE = {
  id: "src-1",
  name: "위비티",
  feed_url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21",
  feed_type: "wevity" as const,
  default_language: "ko" as const,
  section: "contest" as const,
};

const LIST_HTML = `
<div class="ms-mbnr">
  <ul class="ms-mbnr-sd">
    <li>
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=1&ix=107947"><img src="/upload/contest/20260606170440_f98bad36.jpg" alt="넥슨 영 프로그래머스 컵"></a>
      <div class="hide-info">
        <div class="hide-dday">D-37</div>
      </div>
    </li>
  </ul>
</div>
<ul class="list">
  <li class="top">
    <div class="tit">
      공모전명
    </div>
    <div class="organ">주최사</div>
    <div class="day">
      현재현황
    </div>
    <div class="read">조회수</div>
  </li>
  <li><!--class="bg" -->
    <div class="tit">
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=1&ix=107947">넥슨 영 프로그래머스 컵  <span class='stat spec'>SPECIAL</span> </a>
      <div class="sub-tit">분야 : 웹/모바일/IT, 게임/소프트웨어</div>
    </div>
    <div class="organ">넥슨</div>
    <div class="day">
      D-37							<span class="dday ing">접수중</span>
    </div>
    <div class="read">11,799</div>
  </li>
  <li class='bg'><!--class="bg" -->
    <div class="tit">
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=1&ix=107424">2026 공공데이터 활용 창업경진대회 <span class='stat spec'>SPECIAL</span> <span class='stat idea'>IDEA</span></a>
      <div class="sub-tit">분야 : 기획/아이디어, 웹/모바일/IT</div>
    </div>
    <div class="organ">부산광역시</div>
    <div class="day">
      D-13							<span class="dday ing">접수중</span>
    </div>
    <div class="read">54,313</div>
  </li>
</ul>
`;

describe("parseWevityList", () => {
  it("목록 항목을 ContentItemInsert로 파싱한다", () => {
    const result = parseWevityList(LIST_HTML, SOURCE);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      url: "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=107947",
      slug: "wevity-107947",
      section: "contest",
      title: "넥슨 영 프로그래머스 컵",
      description: "분야 : 웹/모바일/IT, 게임/소프트웨어",
      source: "넥슨",
      status: "published",
      language: "ko",
    });
  });

  it("헤더 행(공모전명)은 제외한다", () => {
    const result = parseWevityList(LIST_HTML, SOURCE);
    expect(result.every((item) => item.title !== "공모전명")).toBe(true);
  });

  it("D-day를 KST 마감일로 변환한다", () => {
    const now = new Date("2026-06-12T03:00:00.000Z"); // KST 2026-06-12 12:00
    const result = parseWevityList(LIST_HTML, SOURCE, now);
    // D-37 → 2026-07-19 23:59:59 KST = 2026-07-19T14:59:59Z
    expect(result[0]!.deadline).toBe("2026-07-19T14:59:59.000Z");
  });

  it("IDEA 배지가 있으면 idea-contest로 분류한다", () => {
    const result = parseWevityList(LIST_HTML, SOURCE);
    expect(result[1]!.contest_type).toBe("idea-contest");
  });

  it("스페셜 배너에 포스터가 있으면 절대경로 썸네일로 사용한다", () => {
    const result = parseWevityList(LIST_HTML, SOURCE);
    expect(result[0]!.thumbnail).toBe(
      "https://www.wevity.com/upload/contest/20260606170440_f98bad36.jpg",
    );
  });

  it("포스터가 없는 항목은 썸네일을 null로 둔다", () => {
    const result = parseWevityList(LIST_HTML, SOURCE);
    expect(result[1]!.thumbnail).toBeNull();
  });
});

describe("isDevContest", () => {
  it("개발 키워드가 있으면 true다", () => {
    expect(isDevContest("넥슨 영 프로그래머스 컵")).toBe(true);
    expect(isDevContest("2026 오픈소스 해커톤")).toBe(true);
    expect(isDevContest("앱 개발 공모전")).toBe(true);
    expect(isDevContest("빅데이터 분석 경진대회")).toBe(true);
    expect(isDevContest("정보보호 사이버공방전")).toBe(true);
    expect(isDevContest("글로벌 인디 게임제작 경진대회")).toBe(true);
    expect(isDevContest("GNGC GAME JAM")).toBe(true);
  });

  it("영상/디자인류 공모전은 false다", () => {
    expect(isDevContest("서울 디자인 AI 영상 공모전")).toBe(false);
    expect(isDevContest("민주·인권·평화 영상(+AI) 콘텐츠 공모전")).toBe(false);
    expect(isDevContest("브랜드 포스터 디자인 공모전")).toBe(false);
  });

  it("개발 신호가 없으면 false다", () => {
    expect(isDevContest("가상현실 공간 창작 공모전")).toBe(false);
  });

  it("개발 키워드가 있어도 영상/디자인 키워드가 있으면 false다", () => {
    expect(isDevContest("데이터 시각화 포스터 디자인 공모전")).toBe(false);
  });
});

describe("parseWevityList 필터링", () => {
  const NON_DEV_HTML = `
<ul class="list">
  <li><!--class="bg" -->
    <div class="tit">
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=1&ix=200001">서울 디자인 AI 영상 공모전</a>
      <div class="sub-tit">분야 : 광고/마케팅, 영상/UCC/사진, 웹/모바일/IT</div>
    </div>
    <div class="organ">서울특별시</div>
    <div class="day">
      D-18 <span class="dday ing">접수중</span>
    </div>
    <div class="read">37,544</div>
  </li>
  <li><!--class="bg" -->
    <div class="tit">
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=1&ix=200002">스마트시티 아이디어 공모전 <span class='stat idea'>IDEA</span></a>
      <div class="sub-tit">분야 : 기획/아이디어, 웹/모바일/IT</div>
    </div>
    <div class="organ">국토교통부</div>
    <div class="day">
      D-10 <span class="dday ing">접수중</span>
    </div>
    <div class="read">1,000</div>
  </li>
</ul>
`;

  it("개발 관련이 아닌 공모전은 제외한다", () => {
    const result = parseWevityList(NON_DEV_HTML, SOURCE);
    expect(result.map((item) => item.title)).not.toContain(
      "서울 디자인 AI 영상 공모전",
    );
  });

  it("IDEA 배지가 있는 IT 아이디어 공모전은 포함한다", () => {
    const result = parseWevityList(NON_DEV_HTML, SOURCE);
    const idea = result.find((item) => item.slug === "wevity-200002");
    expect(idea).toBeDefined();
    expect(idea!.contest_type).toBe("idea-contest");
  });
});

describe("classifyContestType", () => {
  it("해커톤 키워드를 분류한다", () => {
    expect(classifyContestType("2026 오픈소스 해커톤")).toBe("hackathon");
    expect(classifyContestType("Junction Hackathon")).toBe("hackathon");
  });

  it("아이디어 키워드를 분류한다", () => {
    expect(classifyContestType("스마트시티 아이디어 공모전")).toBe("idea-contest");
  });

  it("데이터/AI 키워드를 분류한다", () => {
    expect(classifyContestType("빅데이터 분석 경진대회")).toBe("data-competition");
    expect(classifyContestType("AI 활용 공모전")).toBe("data-competition");
  });

  it("기본값은 dev-contest다", () => {
    expect(classifyContestType("앱 개발 공모전")).toBe("dev-contest");
  });
});

describe("deadlineFromDday", () => {
  it("D-0은 KST 오늘 23:59:59다", () => {
    const now = new Date("2026-06-12T03:00:00.000Z"); // KST 2026-06-12 12:00
    expect(deadlineFromDday(0, now)).toBe("2026-06-12T14:59:59.000Z");
  });

  it("KST 자정 직후에도 KST 날짜 기준으로 계산한다", () => {
    const now = new Date("2026-06-12T15:30:00.000Z"); // KST 2026-06-13 00:30
    expect(deadlineFromDday(1, now)).toBe("2026-06-14T14:59:59.000Z");
  });
});

const DETAIL_HTML = `
<meta property="og:image" content="https://www.wevity.com/upload/contest/20260606170440_f98bad36.jpg" id="og_image"/>
<ul>
  <li class="dday-area">
    <span class="tit">접수기간</span>
    2026-06-04 ~ 2026-07-19
    <span class="cil-dday">D-37</span>
  </li>
  <li>
    <span class="tit">홈페이지</span>
    <a href="https://example.com/contest" target="_blank">https://example.com/contest</a>
  </li>
</ul>
`;

describe("parseWevityDetail", () => {
  it("홈페이지 링크, 포스터, 접수 마감일을 추출한다", () => {
    const result = parseWevityDetail(DETAIL_HTML);
    expect(result.homepageUrl).toBe("https://example.com/contest");
    expect(result.posterUrl).toBe(
      "https://www.wevity.com/upload/contest/20260606170440_f98bad36.jpg",
    );
    // 접수기간 종료일 2026-07-19의 KST 23:59:59
    expect(result.deadline).toBe("2026-07-19T14:59:59.000Z");
  });

  it("정보가 없으면 null을 반환한다", () => {
    const result = parseWevityDetail("<html></html>");
    expect(result.homepageUrl).toBeNull();
    expect(result.posterUrl).toBeNull();
    expect(result.deadline).toBeNull();
  });

  it("og:image가 공모전 포스터가 아니면 무시한다", () => {
    const result = parseWevityDetail(
      '<meta property="og:image" content="https://www.wevity.com/images/main_img16.png"/>',
    );
    expect(result.posterUrl).toBeNull();
  });
});

describe("fetchWevity", () => {
  beforeEach(() => vi.clearAllMocks());

  function stubFetch() {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string) => {
        const target = String(input);
        if (target.includes("gbn=viewok")) {
          return { ok: true, text: async () => DETAIL_HTML };
        }
        return { ok: true, text: async () => LIST_HTML };
      }),
    );
  }

  it("정상 응답이면 ContentItemInsert 배열을 반환한다", async () => {
    stubFetch();

    const result = await fetchWevity(SOURCE, new AbortController().signal);
    expect(result).toHaveLength(2);
    expect(result[0]!.section).toBe("contest");
  });

  it("상세 페이지의 원문 링크/포스터/마감일로 항목을 보강한다", async () => {
    stubFetch();

    const result = await fetchWevity(SOURCE, new AbortController().signal);
    expect(result[0]!.url).toBe("https://example.com/contest");
    expect(result[0]!.thumbnail).toBe(
      "https://www.wevity.com/upload/contest/20260606170440_f98bad36.jpg",
    );
    expect(result[0]!.deadline).toBe("2026-07-19T14:59:59.000Z");
    // slug는 위비티 ix 기준으로 유지된다 (중복 제거 키)
    expect(result[0]!.slug).toBe("wevity-107947");
  });

  it("상세 페이지 fetch가 실패하면 목록 데이터로 유지한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string) => {
        if (String(input).includes("gbn=viewok")) {
          return { ok: false, status: 500 };
        }
        return { ok: true, text: async () => LIST_HTML };
      }),
    );

    const result = await fetchWevity(SOURCE, new AbortController().signal);
    expect(result).toHaveLength(2);
    expect(result[0]!.url).toBe(
      "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&gbn=view&ix=107947",
    );
  });

  it("목록 HTTP 오류면 예외를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchWevity(SOURCE, new AbortController().signal)).rejects.toThrow(
      "HTTP 500",
    );
  });

  it("여러 페이지를 수집하고 페이지 간 중복(ix)을 제거한다", async () => {
    const PAGE2_HTML = `
<ul class="list">
  <li>
    <div class="tit">
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=2&ix=107947">넥슨 영 프로그래머스 컵</a>
      <div class="sub-tit">분야 : 웹/모바일/IT</div>
    </div>
    <div class="organ">넥슨</div>
    <div class="day">
      D-37 <span class="dday ing">접수중</span>
    </div>
    <div class="read">1</div>
  </li>
  <li>
    <div class="tit">
      <a href="?c=find&s=1&gub=1&cidx=21&gbn=view&gp=2&ix=105000">예전에 등록된 코딩 경진대회</a>
      <div class="sub-tit">분야 : 웹/모바일/IT</div>
    </div>
    <div class="organ">한국정보화진흥원</div>
    <div class="day">
      D-50 <span class="dday ing">접수중</span>
    </div>
    <div class="read">1</div>
  </li>
</ul>
`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: string) => {
        const target = String(input);
        if (target.includes("gbn=viewok")) {
          return { ok: true, text: async () => DETAIL_HTML };
        }
        if (target.includes("gp=2")) {
          return { ok: true, text: async () => PAGE2_HTML };
        }
        if (target.includes("gp=3")) {
          return { ok: true, text: async () => "<ul class='list'></ul>" };
        }
        return { ok: true, text: async () => LIST_HTML };
      }),
    );

    const result = await fetchWevity(SOURCE, new AbortController().signal);
    const slugs = result.map((item) => item.slug);
    // 1페이지 2건 + 2페이지 신규 1건 (ix=107947은 중복 제거)
    expect(slugs).toHaveLength(3);
    expect(slugs.filter((slug) => slug === "wevity-107947")).toHaveLength(1);
    expect(slugs).toContain("wevity-105000");
  });
});
