import { describe, expect, it } from "vitest";
import { CONTENT_CATEGORIES, CONTENT_TYPES, createSlug } from ".";

describe("shared constants", () => {
  it("contains the initial TechHub categories and content types", () => {
    expect(CONTENT_CATEGORIES).toContain("Frontend");
    expect(CONTENT_CATEGORIES).toContain("LLM/GenAI");
    expect(CONTENT_CATEGORIES).toContain("AI Agents");
    expect(CONTENT_TYPES).toEqual(["article", "youtube"]);
  });
});

describe("createSlug", () => {
  it("normalizes text into a URL slug", () => {
    expect(createSlug("Next.js App Router 운영 패턴")).toBe(
      "next-js-app-router-운영-패턴"
    );
  });
});
