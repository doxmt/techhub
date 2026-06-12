import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  __dirname,
  "../../../../supabase/migrations/20260612000000_fix_news_source_sections.sql",
);
const sql = fs.readFileSync(migrationPath, "utf-8");

describe("news section repair migration", () => {
  it("marks dev.to source as news", () => {
    expect(sql).toContain("'https://dev.to/feed'");
    expect(sql).toMatch(/UPDATE\s+sources[\s\S]+SET\s+section\s*=\s*'news'/i);
  });

  it("deletes already-ingested dev.to article content", () => {
    expect(sql).toContain("'dev.to'");
    expect(sql).toMatch(/DELETE\s+FROM\s+content_items[\s\S]+source\s*=\s*'dev\.to'/i);
    expect(sql).toMatch(/section\s*=\s*'article'/i);
  });

  it("marks stale running ingestion runs as failed", () => {
    expect(sql).toMatch(/UPDATE\s+ingestion_runs[\s\S]+status\s*=\s*'failed'/i);
  });
});
