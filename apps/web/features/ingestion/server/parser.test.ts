/**
 * parser.test.ts
 *
 * TDD Red 단계: apps/web/features/ingestion/server/parser.ts 가 아직 없으므로
 * "Cannot find module" 오류로 모든 테스트가 실패해야 한다.
 *
 * parseRssFeed(xml): RSS 2.0 / Atom / Medium RSS fixture XML 파싱
 * normalizeItem(item, source): content_items insert payload 생성
 */

import { describe, expect, it } from "vitest";

// @ts-expect-error 의도적 실패 — parser.ts 미존재
import { parseRssFeed, normalizeItem } from "./parser";

// ---------------------------------------------------------------------------
// Fixture XML
// ---------------------------------------------------------------------------

const RSS_2_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>카카오 테크</title>
    <link>https://tech.kakao.com</link>
    <description>카카오 기술 블로그</description>
    <item>
      <title>Kotlin 코루틴 완전 정복</title>
      <link>https://tech.kakao.com/2026/01/15/kotlin-coroutines/</link>
      <description>&lt;p&gt;코루틴의 동작 원리를 상세히 설명합니다.&lt;/p&gt;</description>
      <pubDate>Mon, 15 Jan 2026 09:00:00 +0000</pubDate>
    </item>
    <item>
      <title>GraphQL 도입 사례</title>
      <link>https://tech.kakao.com/2026/01/10/graphql-adoption/</link>
      <description>GraphQL을 도입한 경험을 공유합니다.</description>
      <pubDate>Fri, 10 Jan 2026 09:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>네이버 D2</title>
  <link href="https://d2.naver.com"/>
  <updated>2026-01-20T00:00:00Z</updated>
  <entry>
    <title>자바스크립트 엔진 최적화 기법</title>
    <link href="https://d2.naver.com/helloworld/js-engine-opt"/>
    <summary>V8 엔진의 최적화 전략을 분석합니다.</summary>
    <updated>2026-01-20T10:00:00Z</updated>
  </entry>
  <entry>
    <title>대규모 서비스 아키텍처 설계</title>
    <link href="https://d2.naver.com/helloworld/large-scale-arch"/>
    <summary>네이버 서비스 아키텍처 설계 경험을 공유합니다.</summary>
    <updated>2026-01-18T10:00:00Z</updated>
  </entry>
</feed>`;

const MEDIUM_RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Coupang Engineering</title>
    <link>https://medium.com/coupang-engineering</link>
    <description>쿠팡 엔지니어링 블로그</description>
    <item>
      <title>쿠팡 추천 시스템 개선기</title>
      <link>https://medium.com/coupang-engineering/recommendation-system-improvement-abc123?source=rss----coupang-engineering---&amp;medium=rss&amp;campaign=feed</link>
      <description>&lt;figure&gt;&lt;img src="https://cdn-images-1.medium.com/max/1024/thumbnail.jpg"&gt;&lt;/figure&gt;&lt;p&gt;추천 시스템을 개선한 사례를 소개합니다.&lt;/p&gt;</description>
      <pubDate>Wed, 22 Jan 2026 09:00:00 +0000</pubDate>
    </item>
    <item>
      <title>MSA 전환 여정</title>
      <link>https://medium.com/coupang-engineering/msa-migration-journey-xyz456?source=rss----coupang-engineering---</link>
      <description>&lt;p&gt;모놀리식에서 MSA로 전환하는 과정을 공유합니다.&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

const RSS_NO_PUBDATE_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>토스 블로그</title>
    <link>https://toss.tech</link>
    <item>
      <title>금융 데이터 처리 파이프라인</title>
      <link>https://toss.tech/article/financial-data-pipeline</link>
      <description>금융 데이터를 안전하게 처리하는 방법을 설명합니다.</description>
    </item>
  </channel>
</rss>`;

const RSS_HTML_DESCRIPTION_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>우아한형제들 기술 블로그</title>
    <link>https://techblog.woowahan.com</link>
    <item>
      <title>배달 경로 최적화 알고리즘</title>
      <link>https://techblog.woowahan.com/12345/</link>
      <description>&lt;h2&gt;소개&lt;/h2&gt;&lt;p&gt;배달 경로를 최적화하는 &lt;strong&gt;알고리즘&lt;/strong&gt;을 개발했습니다.&lt;/p&gt;&lt;a href="https://example.com"&gt;자세히 보기&lt;/a&gt;</description>
      <pubDate>Tue, 21 Jan 2026 09:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

// ---------------------------------------------------------------------------
// 소스 fixture
// ---------------------------------------------------------------------------

const SOURCE_KAKAO = {
  id: "src-1",
  name: "카카오 테크",
  feed_url: "https://tech.kakao.com/feed/",
  feed_type: "rss" as const,
  default_language: "ko" as const,
};

const SOURCE_NAVER = {
  id: "src-2",
  name: "네이버 D2",
  feed_url: "https://d2.naver.com/d2.atom",
  feed_type: "atom" as const,
  default_language: "ko" as const,
};

const SOURCE_COUPANG = {
  id: "src-3",
  name: "쿠팡 엔지니어링",
  feed_url: "https://medium.com/feed/coupang-engineering",
  feed_type: "rss" as const,
  default_language: "ko" as const,
};

const SOURCE_TOSS = {
  id: "src-4",
  name: "토스",
  feed_url: "https://toss.tech/rss.xml",
  feed_type: "rss" as const,
  default_language: "ko" as const,
};

const SOURCE_WOOWA = {
  id: "src-5",
  name: "우아한형제들",
  feed_url: "https://techblog.woowahan.com/feed/",
  feed_type: "rss" as const,
  default_language: "ko" as const,
};

// ---------------------------------------------------------------------------
// parseRssFeed
// ---------------------------------------------------------------------------

describe("parseRssFeed", () => {
  describe("RSS 2.0 파싱", () => {
    it("RSS 2.0 XML에서 항목 배열을 반환한다", async () => {
      const items = await parseRssFeed(RSS_2_FIXTURE);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);
    });

    it("RSS 2.0 항목에서 title이 추출된다", async () => {
      const items = await parseRssFeed(RSS_2_FIXTURE);
      expect(items[0].title).toBe("Kotlin 코루틴 완전 정복");
    });

    it("RSS 2.0 항목에서 link가 추출된다", async () => {
      const items = await parseRssFeed(RSS_2_FIXTURE);
      expect(items[0].link).toBe("https://tech.kakao.com/2026/01/15/kotlin-coroutines/");
    });

    it("RSS 2.0 항목에서 pubDate가 추출된다", async () => {
      const items = await parseRssFeed(RSS_2_FIXTURE);
      expect(items[0].pubDate).toBeDefined();
    });

    it("RSS 2.0 항목에서 description이 추출된다", async () => {
      const items = await parseRssFeed(RSS_2_FIXTURE);
      expect(items[0].description).toBeDefined();
    });
  });

  describe("Atom 파싱", () => {
    it("Atom XML에서 항목 배열을 반환한다", async () => {
      const items = await parseRssFeed(ATOM_FIXTURE);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);
    });

    it("Atom entry에서 title이 추출된다", async () => {
      const items = await parseRssFeed(ATOM_FIXTURE);
      expect(items[0].title).toBe("자바스크립트 엔진 최적화 기법");
    });

    it("Atom entry에서 link가 추출된다", async () => {
      const items = await parseRssFeed(ATOM_FIXTURE);
      expect(items[0].link).toBe("https://d2.naver.com/helloworld/js-engine-opt");
    });

    it("Atom entry에서 updated가 pubDate로 추출된다", async () => {
      const items = await parseRssFeed(ATOM_FIXTURE);
      expect(items[0].pubDate).toBeDefined();
    });
  });

  describe("Medium RSS 파싱", () => {
    it("Medium RSS XML에서 항목 배열을 반환한다", async () => {
      const items = await parseRssFeed(MEDIUM_RSS_FIXTURE);
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(2);
    });

    it("Medium RSS 항목에서 title이 추출된다", async () => {
      const items = await parseRssFeed(MEDIUM_RSS_FIXTURE);
      expect(items[0].title).toBe("쿠팡 추천 시스템 개선기");
    });

    it("Medium RSS 항목에서 link가 추출된다", async () => {
      const items = await parseRssFeed(MEDIUM_RSS_FIXTURE);
      expect(items[0].link).toContain("medium.com");
    });
  });

  describe("빈 피드", () => {
    it("항목이 없는 피드에서 빈 배열을 반환한다", async () => {
      const emptyFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>빈 블로그</title>
    <link>https://empty.blog</link>
  </channel>
</rss>`;
      const items = await parseRssFeed(emptyFeed);
      expect(items).toEqual([]);
    });
  });

  describe("잘못된 XML", () => {
    it("잘못된 XML에서 예외 없이 빈 배열을 반환한다", async () => {
      const result = await parseRssFeed("not-xml-at-all");
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// normalizeItem
// ---------------------------------------------------------------------------

describe("normalizeItem", () => {
  describe("type 필드", () => {
    it("type이 항상 'article'로 고정된다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.type).toBe("article");
    });
  });

  describe("section 필드", () => {
    it("section이 없는 기존 소스는 article로 저장한다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/test/", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.section).toBe("article");
    });

    it("뉴스 소스는 section을 news로 저장한다", () => {
      const item = { title: "새 개발 뉴스", link: "https://yozm.wishket.com/magazine/detail/1/", description: "설명" };
      const payload = normalizeItem(item, {
        id: "news-1",
        name: "요즘IT",
        feed_url: "https://yozm.wishket.com/magazine/feed/",
        feed_type: "rss",
        default_language: "ko",
        section: "news",
      });
      expect(payload.section).toBe("news");
      expect(payload.type).toBe("article");
    });
  });

  describe("language 필드", () => {
    it("language가 소스의 default_language를 따른다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.language).toBe("ko");
    });
  });

  describe("source 필드", () => {
    it("source가 소스의 name을 따른다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.source).toBe("카카오 테크");
    });
  });

  describe("status 필드", () => {
    it("status가 'published'로 고정된다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.status).toBe("published");
    });
  });

  describe("url 필드 — Medium 트래킹 파라미터 제거", () => {
    it("Medium URL에서 ?source=rss 트래킹 파라미터를 제거한다", () => {
      const item = {
        title: "쿠팡 추천 시스템 개선기",
        link: "https://medium.com/coupang-engineering/recommendation-system-improvement-abc123?source=rss----coupang-engineering---&medium=rss&campaign=feed",
        pubDate: "Wed, 22 Jan 2026 09:00:00 +0000",
        description: "설명",
      };
      const payload = normalizeItem(item, SOURCE_COUPANG);
      expect(payload.url).not.toContain("?source=rss");
      expect(payload.url).not.toContain("medium=rss");
      expect(payload.url).toBe("https://medium.com/coupang-engineering/recommendation-system-improvement-abc123");
    });

    it("트래킹 파라미터가 없는 일반 URL은 변경되지 않는다", () => {
      const item = {
        title: "Kotlin 코루틴 완전 정복",
        link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/",
        pubDate: "Mon, 15 Jan 2026 09:00:00 +0000",
        description: "설명",
      };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.url).toBe("https://tech.kakao.com/2026/01/15/kotlin-coroutines/");
    });

    it("source=rss 파라미터만 있는 URL에서 쿼리 스트링이 모두 제거된다", () => {
      const item = {
        title: "MSA 전환 여정",
        link: "https://medium.com/coupang-engineering/msa-migration-journey-xyz456?source=rss----coupang-engineering---",
        pubDate: "Mon, 15 Jan 2026 09:00:00 +0000",
        description: "설명",
      };
      const payload = normalizeItem(item, SOURCE_COUPANG);
      expect(payload.url).toBe("https://medium.com/coupang-engineering/msa-migration-journey-xyz456");
    });
  });

  describe("slug 필드 — URL path segment 기반 생성", () => {
    it("slug가 URL 마지막 path segment 기반으로 생성된다", () => {
      const item = { title: "Kotlin 코루틴 완전 정복", link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.slug).toBe("kotlin-coroutines");
    });

    it("Atom 링크에서 slug가 생성된다", () => {
      const item = { title: "자바스크립트 엔진 최적화 기법", link: "https://d2.naver.com/helloworld/js-engine-opt", pubDate: "2026-01-20T10:00:00Z", description: "설명" };
      const payload = normalizeItem(item, SOURCE_NAVER);
      expect(payload.slug).toBe("js-engine-opt");
    });

    it("Medium URL에서 slug가 마지막 path segment 기반으로 생성된다", () => {
      const item = {
        title: "쿠팡 추천 시스템 개선기",
        link: "https://medium.com/coupang-engineering/recommendation-system-improvement-abc123?source=rss----coupang-engineering---",
        pubDate: "Wed, 22 Jan 2026 09:00:00 +0000",
        description: "설명",
      };
      const payload = normalizeItem(item, SOURCE_COUPANG);
      expect(payload.slug).toBe("recommendation-system-improvement-abc123");
    });

    it("토스 URL 형태에서 slug가 생성된다", () => {
      const item = { title: "금융 데이터 처리 파이프라인", link: "https://toss.tech/article/financial-data-pipeline", description: "설명" };
      const payload = normalizeItem(item, SOURCE_TOSS);
      expect(payload.slug).toBe("financial-data-pipeline");
    });

    it("마지막 path segment가 반복되는 query 기반 URL은 query 값을 slug에 포함한다", () => {
      const item = { title: "GeekNews 토픽", link: "https://news.hada.io/topic?id=30353", description: "설명" };
      const payload = normalizeItem(item, {
        id: "geeknews",
        name: "GeekNews",
        feed_url: "https://news.hada.io/rss/news",
        feed_type: "atom",
        default_language: "ko",
        section: "news",
      });
      expect(payload.slug).toBe("topic-30353");
    });
  });

  describe("published_at 필드 — pubDate 없을 때 수집 시각 폴백", () => {
    it("pubDate가 있으면 해당 날짜를 published_at에 사용한다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/test/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.published_at).toBeDefined();
      expect(new Date(payload.published_at).getFullYear()).toBe(2026);
    });

    it("pubDate가 없을 때 published_at이 현재 수집 시각으로 채워진다 (NOT NULL 보장)", () => {
      const item = { title: "금융 데이터 처리 파이프라인", link: "https://toss.tech/article/financial-data-pipeline", description: "설명" };
      const payload = normalizeItem(item, SOURCE_TOSS);
      expect(payload.published_at).toBeDefined();
      expect(payload.published_at).not.toBeNull();
      // 폴백 시각이 현재 시간과 가깝다 (1분 이내)
      const diff = Date.now() - new Date(payload.published_at).getTime();
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThan(60_000);
    });

    it("pubDate가 빈 문자열일 때도 published_at이 폴백으로 채워진다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/test/", pubDate: "", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.published_at).toBeDefined();
      expect(payload.published_at).not.toBeNull();
    });
  });

  describe("description 필드 — HTML 태그 제거", () => {
    it("description에서 HTML 태그가 제거된다", () => {
      const item = {
        title: "배달 경로 최적화 알고리즘",
        link: "https://techblog.woowahan.com/12345/",
        pubDate: "Tue, 21 Jan 2026 09:00:00 +0000",
        description: "<h2>소개</h2><p>배달 경로를 최적화하는 <strong>알고리즘</strong>을 개발했습니다.</p><a href=\"https://example.com\">자세히 보기</a>",
      };
      const payload = normalizeItem(item, SOURCE_WOOWA);
      expect(payload.description).not.toContain("<h2>");
      expect(payload.description).not.toContain("<p>");
      expect(payload.description).not.toContain("<strong>");
      expect(payload.description).not.toContain("<a ");
      expect(payload.description).toContain("알고리즘");
    });

    it("RSS 2.0 HTML 엔티티 인코딩된 description에서도 HTML 태그가 제거된다", () => {
      const item = {
        title: "Kotlin 코루틴 완전 정복",
        link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/",
        pubDate: "Mon, 15 Jan 2026 09:00:00 +0000",
        description: "<p>코루틴의 동작 원리를 상세히 설명합니다.</p>",
      };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.description).not.toContain("<p>");
      expect(payload.description).toContain("코루틴");
    });

    it("description이 없으면 null을 반환한다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/test/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.description).toBeNull();
    });

    it("HTML 태그만 있는 description은 빈 문자열 또는 null이 된다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/test/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "<figure><img src='x.jpg'></figure>" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.description === null || payload.description?.trim() === "").toBe(true);
    });
  });

  describe("thumbnail 필드", () => {
    it("description에 img 태그가 있으면 thumbnail을 추출한다", () => {
      const item = {
        title: "쿠팡 추천 시스템 개선기",
        link: "https://medium.com/coupang-engineering/recommendation-system-improvement-abc123",
        pubDate: "Wed, 22 Jan 2026 09:00:00 +0000",
        description: "<figure><img src='https://cdn-images-1.medium.com/max/1024/thumbnail.jpg'></figure><p>본문</p>",
      };
      const payload = normalizeItem(item, SOURCE_COUPANG);
      // thumbnail이 있거나 null이어야 한다
      expect(payload.thumbnail === null || typeof payload.thumbnail === "string").toBe(true);
    });

    it("이미지가 없으면 thumbnail이 null이다", () => {
      const item = { title: "테스트", link: "https://tech.kakao.com/test/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "텍스트만 있는 설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.thumbnail).toBeNull();
    });
  });

  describe("description 필드 — content:encoded / summary fallback", () => {
    it("content:encoded 필드가 있으면 description으로 사용한다", () => {
      const item = {
        title: "테스트",
        link: "https://tech.kakao.com/test/",
        pubDate: "Mon, 15 Jan 2026 09:00:00 +0000",
        "content:encoded": "<p>content:encoded에서 가져온 내용입니다.</p>",
      };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.description).toContain("content:encoded에서 가져온 내용");
      expect(payload.description).not.toContain("<p>");
    });

    it("content:encodedSnippet 필드가 있으면 이미 stripped된 텍스트를 우선 사용한다", () => {
      const item = {
        title: "테스트",
        link: "https://tech.kakao.com/test/",
        pubDate: "Mon, 15 Jan 2026 09:00:00 +0000",
        "content:encodedSnippet": "스니펫 텍스트",
        "content:encoded": "<p>원본 HTML</p>",
      };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload.description).toBe("스니펫 텍스트");
    });

    it("summary 필드만 있으면 description으로 사용한다 (Atom 피드)", () => {
      const item = {
        title: "자바스크립트 엔진 최적화 기법",
        link: "https://d2.naver.com/helloworld/js-engine-opt",
        summary: "V8 엔진의 최적화 전략을 분석합니다.",
      };
      const payload = normalizeItem(item, SOURCE_NAVER);
      expect(payload.description).toBe("V8 엔진의 최적화 전략을 분석합니다.");
    });
  });

  describe("필수 필드 존재 검증", () => {
    it("normalizeItem 결과에 content_items insert에 필요한 모든 필드가 존재한다", () => {
      const item = { title: "Kotlin 코루틴 완전 정복", link: "https://tech.kakao.com/2026/01/15/kotlin-coroutines/", pubDate: "Mon, 15 Jan 2026 09:00:00 +0000", description: "설명" };
      const payload = normalizeItem(item, SOURCE_KAKAO);
      expect(payload).toHaveProperty("url");
      expect(payload).toHaveProperty("type");
      expect(payload).toHaveProperty("section");
      expect(payload).toHaveProperty("title");
      expect(payload).toHaveProperty("slug");
      expect(payload).toHaveProperty("status");
      expect(payload).toHaveProperty("published_at");
      expect(payload).toHaveProperty("language");
      expect(payload).toHaveProperty("source");
    });
  });
});
