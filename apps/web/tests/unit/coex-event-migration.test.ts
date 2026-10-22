import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  __dirname,
  "../../../../supabase/migrations/20261022090000_coex_event_section.sql",
);
const sql = fs.readFileSync(migrationPath, "utf-8");

describe("coex event section migration", () => {
  it("content_items.section 제약에 event를 허용한다", () => {
    expect(sql).toMatch(
      /content_items_section_check[\s\S]+CHECK\s*\(section IN \('article', 'news', 'contest', 'event'\)\)/i,
    );
  });

  it("sources.section 제약에 event를 허용한다", () => {
    expect(sql).toMatch(
      /sources_section_check[\s\S]+CHECK\s*\(section IN \('article', 'news', 'contest', 'event'\)\)/i,
    );
  });

  it("sources.feed_type 제약에 coex를 허용한다", () => {
    expect(sql).toMatch(
      /sources_feed_type_check[\s\S]+'rss', 'atom', 'wevity', 'contestkorea', 'coex'/i,
    );
  });

  it("코엑스 소스를 event 섹션으로 등록한다", () => {
    expect(sql).toContain("'https://www.coex.co.kr/event/full-schedules/?list_type=LIST'");
    expect(sql).toMatch(/'코엑스'[\s\S]+'coex'[\s\S]+'ko'[\s\S]+'event'[\s\S]+true/);
    expect(sql).toMatch(/ON CONFLICT \(feed_url\) DO UPDATE/i);
  });
});
