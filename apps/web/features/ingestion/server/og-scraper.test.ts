import { describe, it, expect } from "vitest";
import { extractOgMeta } from "./og-scraper";

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
});
