import { describe, expect, it } from "vitest";
import { parseFeedParams } from "./feed-params";

describe("parseFeedParams", () => {
  it("유효한 모든 필드를 정상적으로 파싱한다", () => {
    const result = parseFeedParams({
      q: "react",
      category: "FE",
      type: "article",
      lang: "ko",
    });
    expect(result).toEqual({
      q: "react",
      category: "FE",
      type: "article",
      lang: "ko",
    });
  });

  it("빈 객체이면 모든 필드가 undefined이다", () => {
    const result = parseFeedParams({});
    expect(result.q).toBeUndefined();
    expect(result.category).toBeUndefined();
    expect(result.type).toBeUndefined();
    expect(result.lang).toBeUndefined();
  });

  it("type이 유효하지 않으면 undefined를 반환한다", () => {
    const result = parseFeedParams({ type: "invalid" });
    expect(result.type).toBeUndefined();
  });

  it("lang이 유효하지 않으면 undefined를 반환한다", () => {
    const result = parseFeedParams({ lang: "invalid" });
    expect(result.lang).toBeUndefined();
  });

  it("유효한 type 'youtube'를 파싱한다", () => {
    const result = parseFeedParams({ type: "youtube" });
    expect(result.type).toBe("youtube");
  });

  it("유효한 lang 'en'을 파싱한다", () => {
    const result = parseFeedParams({ lang: "en" });
    expect(result.lang).toBe("en");
  });
});
