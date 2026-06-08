import { describe, expect, it } from "vitest";
import { parseFeedParams } from "./feed-params";

describe("parseFeedParams", () => {
  it("유효한 모든 필드를 정상적으로 파싱한다", () => {
    const result = parseFeedParams({
      q: "react",
      categories: "fe,be",
      source: "토스",
      type: "article",
      lang: "ko",
      section: "article",
    });
    expect(result).toEqual({
      q: "react",
      categories: ["fe", "be"],
      source: "토스",
      type: "article",
      lang: "ko",
      section: "article",
    });
  });

  it("빈 객체이면 모든 필드가 undefined이다", () => {
    const result = parseFeedParams({});
    expect(result.q).toBeUndefined();
    expect(result.categories).toBeUndefined();
    expect(result.source).toBeUndefined();
    expect(result.type).toBeUndefined();
    expect(result.lang).toBeUndefined();
    expect(result.section).toBeUndefined();
  });

  it("유효하지 않은 카테고리 슬러그는 필터링된다", () => {
    const result = parseFeedParams({ categories: "fe,invalid,be" });
    expect(result.categories).toEqual(["fe", "be"]);
  });

  it("카테고리는 최대 3개까지만 파싱한다", () => {
    const result = parseFeedParams({ categories: "fe,be,mobile,cloud" });
    expect(result.categories).toHaveLength(3);
  });

  it("유효하지 않은 source는 undefined를 반환한다", () => {
    const result = parseFeedParams({ source: "없는회사" });
    expect(result.source).toBeUndefined();
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

  it("유효한 section 'contest'를 파싱한다", () => {
    const result = parseFeedParams({ section: "contest" });
    expect(result.section).toBe("contest");
  });

  it("유효한 section 'saved'를 파싱한다", () => {
    const result = parseFeedParams({ section: "saved" });
    expect(result.section).toBe("saved");
  });

  it("section이 유효하지 않으면 undefined를 반환한다", () => {
    const result = parseFeedParams({ section: "invalid" });
    expect(result.section).toBeUndefined();
  });
});
