import { afterEach, describe, expect, it, vi } from "vitest";
import { extractOgMeta, fetchOgMeta } from "./og-scraper";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractOgMeta", () => {
  it("og:image를 추출한다", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/thumb.jpg">
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/thumb.jpg");
  });

  it("og:description을 추출한다", () => {
    const html = `<html><head>
      <meta property="og:description" content="이것은 설명입니다.">
    </head></html>`;
    expect(extractOgMeta(html).description).toBe("이것은 설명입니다.");
  });

  it("og:image 없으면 twitter:image를 사용한다", () => {
    const html = `<html><head>
      <meta name="twitter:image" content="https://example.com/twitter.jpg">
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/twitter.jpg");
  });

  it("twitter:image:src를 이미지 후보로 사용한다", () => {
    const html = `<html><head>
      <meta name="twitter:image:src" content="https://example.com/twitter-src.jpg">
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/twitter-src.jpg");
  });

  it("property twitter:image를 이미지 후보로 사용한다", () => {
    const html = `<html><head>
      <meta property="twitter:image" content="https://example.com/property-twitter.jpg">
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/property-twitter.jpg");
  });

  it("Article JSON-LD 이미지가 있으면 공용 og:image보다 우선한다", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/site-banner.png">
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "headline": "테스트 글",
              "image": {
                "@type": "ImageObject",
                "url": "https://example.com/article-thumb.png"
              }
            }
          ]
        }
      </script>
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/article-thumb.png");
  });

  it("og:description 없으면 meta description을 사용한다", () => {
    const html = `<html><head>
      <meta name="description" content="메타 설명입니다.">
    </head></html>`;
    expect(extractOgMeta(html).description).toBe("메타 설명입니다.");
  });

  it("og:image가 twitter:image보다 우선한다", () => {
    const html = `<html><head>
      <meta name="twitter:image" content="https://example.com/twitter.jpg">
      <meta property="og:image" content="https://example.com/og.jpg">
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/og.jpg");
  });

  it("아무것도 없으면 null을 반환한다", () => {
    const html = `<html><head></head></html>`;
    const result = extractOgMeta(html);
    expect(result.image).toBeNull();
    expect(result.description).toBeNull();
  });

  it("큰따옴표와 작은따옴표 모두 처리한다", () => {
    const html = `<html><head>
      <meta property='og:image' content='https://example.com/single.jpg'>
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/single.jpg");
  });

  it("content 속성의 HTML entity를 디코딩한다", () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/thumb.jpg?fit=1200&#038;ssl=1">
    </head></html>`;
    expect(extractOgMeta(html).image).toBe("https://example.com/thumb.jpg?fit=1200&ssl=1");
  });

  it("D2 페이지에 OG 이미지가 없으면 D2 API postImage를 사용한다", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "<html><head></head><body></body></html>",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ postImage: "/content/images/2026/06/thumb.png" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const meta = await fetchOgMeta("https://d2.naver.com/helloworld/4372269");

    expect(meta.image).toBe("https://d2.naver.com/content/images/2026/06/thumb.png");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://d2.naver.com/api/v1/contents/4372269",
      expect.objectContaining({
        headers: { "User-Agent": "TechHub/1.0 (OG metadata fetcher)" },
      }),
    );
  });

  it("우아한형제들 원본 이미지 URL은 표시 가능한 fallback 썸네일로 교체한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><head>
        <meta property="og:image" content="https://techblog.woowahan.com/wp-content/uploads/2025/07/banner.png">
      </head></html>`,
    });
    vi.stubGlobal("fetch", fetchMock);

    const meta = await fetchOgMeta("https://techblog.woowahan.com/26177/");

    expect(meta.image).toBe(
      "https://i0.wp.com/techblog.woowahan.com/wp-content/uploads/2025/07/%EC%9A%B0%EC%95%84%ED%95%9C%ED%85%8C%ED%81%AC-%EA%B8%B0%EC%88%A0%EB%B8%94%EB%A1%9C%EA%B7%B8-%EB%B0%B0%EB%84%88.png",
    );
  });

  it("우아한형제들 본문 이미지가 있으면 프록시 썸네일로 우선 사용한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><head>
        <meta property="og:image" content="https://techblog.woowahan.com/wp-content/uploads/2025/07/banner.png">
      </head><body>
        <img src="https://techblog.woowahan.com/wp-content/themes/techblog-1/imgs/logo.svg">
        <img src="/wp-content/uploads/2026/04/article-thumb-750x409.png">
      </body></html>`,
    });
    vi.stubGlobal("fetch", fetchMock);

    const meta = await fetchOgMeta("https://techblog.woowahan.com/26177/");

    expect(meta.image).toBe(
      "https://i0.wp.com/techblog.woowahan.com/wp-content/uploads/2026/04/article-thumb-750x409.png",
    );
  });
});
