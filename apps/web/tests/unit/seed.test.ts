import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const seedPath = path.resolve(__dirname, "../../../../supabase/seed.sql");
const sql = fs.readFileSync(seedPath, "utf-8");

const CATEGORY_SLUGS = ["fe", "be", "cloud", "claude-code", "ai-agents", "tools", "architecture", "career"];

describe("seed.sql — 카테고리", () => {
  for (const slug of CATEGORY_SLUGS) {
    it(`카테고리 slug '${slug}' 가 INSERT에 포함된다`, () => {
      expect(sql).toContain(`'${slug}'`);
    });
  }
});

describe("seed.sql — sources", () => {
  it("sources INSERT가 존재한다", () => {
    expect(sql).toMatch(/INSERT\s+INTO\s+sources/i);
  });

  it("RSS 타입 소스가 포함된다", () => {
    expect(sql).toContain("'rss'");
  });

  it("Atom 타입 소스가 포함된다", () => {
    expect(sql).toContain("'atom'");
  });

  it("한국어(ko) 소스가 포함된다", () => {
    expect(sql).toContain("'ko'");
  });
});

describe("seed.sql — 콘텐츠 데이터 없음", () => {
  it("content_items INSERT가 없다 (수집 데이터는 RSS 파이프라인에서 적재)", () => {
    expect(sql).not.toMatch(/INSERT\s+INTO\s+content_items/i);
  });
});
