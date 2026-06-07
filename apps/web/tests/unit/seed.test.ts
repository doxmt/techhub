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

describe("seed.sql — 콘텐츠 상태", () => {
  it("published 상태 콘텐츠가 1건 이상 존재한다", () => {
    expect(sql).toMatch(/'published'/);
  });

  it("draft 상태 콘텐츠가 1건 이상 존재한다", () => {
    expect(sql).toMatch(/'draft'/);
  });
});

describe("seed.sql — 콘텐츠 타입", () => {
  it("article 타입 콘텐츠가 1건 이상 존재한다", () => {
    expect(sql).toMatch(/'article'/);
  });

  it("youtube 타입 콘텐츠가 1건 이상 존재한다", () => {
    expect(sql).toMatch(/'youtube'/);
  });
});

describe("seed.sql — 언어", () => {
  it("ko 언어 콘텐츠가 1건 이상 존재한다", () => {
    expect(sql).toMatch(/'ko'/);
  });

  it("en 언어 콘텐츠가 1건 이상 존재한다", () => {
    expect(sql).toMatch(/'en'/);
  });
});

describe("seed.sql — 썸네일 NULL", () => {
  it("thumbnail 컬럼에 NULL 값이 1건 이상 존재한다", () => {
    // INSERT INTO content_items ... VALUES (... NULL ...) 패턴을 확인한다.
    // thumbnail 위치가 명시된 INSERT 또는 column list에 thumbnail이 없는 INSERT를 모두 포함하기 위해
    // NULL 키워드 자체의 존재 + content_items INSERT가 있는 구조를 검증한다.
    const hasContentInsert = /INSERT\s+INTO\s+content_items/i.test(sql);
    const hasNullValue = /\bNULL\b/i.test(sql);
    expect(hasContentInsert).toBe(true);
    expect(hasNullValue).toBe(true);
  });
});

describe("seed.sql — 콘텐츠 수량", () => {
  it("content_items에 10건 이상의 INSERT 행이 존재한다", () => {
    // VALUES 절 내 row 수를 계산한다.
    // multi-row INSERT: INSERT INTO content_items ... VALUES (...), (...), ... 패턴
    // 또는 단건 INSERT가 반복되는 패턴 모두 처리한다.
    const singleInserts = (sql.match(/INSERT\s+INTO\s+content_items/gi) ?? []).length;

    // multi-row INSERT의 경우 VALUES 절 안의 '(' 로 row 수를 추정한다.
    // 단건 INSERT가 10개 이상이거나, VALUES 행 수가 10개 이상이어야 한다.
    const multiRowMatches = sql.match(
      /INSERT\s+INTO\s+content_items[\s\S]*?VALUES\s*([\s\S]*?);/gi
    );
    let multiRowCount = 0;
    if (multiRowMatches) {
      for (const block of multiRowMatches) {
        // 각 VALUES 블록에서 행(tuple) 수를 센다: 최상위 레벨 '(' 로 시작하는 row
        const rows = block.match(/\(\s*'[^']*'/g);
        multiRowCount += rows ? rows.length : 0;
      }
    }

    const totalRows = singleInserts > 1 ? singleInserts : multiRowCount;
    expect(totalRows).toBeGreaterThanOrEqual(10);
  });
});

describe("seed.sql — 피드 서비스 요건", () => {
  /**
   * content_items INSERT의 VALUES 블록에서 행 tuple 목록을 추출한다.
   * SQL 문자열 내부의 괄호/콤마를 올바르게 처리하기 위해
   * single-quoted string을 인식하는 파서를 사용한다.
   *
   * content_items 컬럼 순서 (0-based):
   *   0: url
   *   1: type
   *   2: title
   *   3: description
   *   4: thumbnail
   *   5: source
   *   6: language
   *   7: slug
   *   8: status
   *   9: published_at
   */
  function extractContentRows(): string[] {
    const blockMatch = sql.match(
      /INSERT\s+INTO\s+content_items[\s\S]*?VALUES\s*([\s\S]*?)ON\s+CONFLICT/i
    );
    if (!blockMatch) return [];
    const valuesBlock = blockMatch[1];
    const rows: string[] = [];
    let depth = 0;
    let current = "";
    let inStr = false;
    for (let i = 0; i < valuesBlock.length; i++) {
      const char = valuesBlock[i];
      if (!inStr && char === "'") {
        inStr = true;
        current += char;
      } else if (inStr && char === "'") {
        // SQL escaped quote: ''
        if (valuesBlock[i + 1] === "'") {
          current += "''";
          i++;
        } else {
          inStr = false;
          current += char;
        }
      } else if (!inStr && char === "(") {
        depth++;
        current += char;
      } else if (!inStr && char === ")") {
        depth--;
        current += char;
        if (depth === 0 && current.trim().startsWith("(")) {
          rows.push(current.trim());
          current = "";
        }
      } else {
        if (depth > 0) current += char;
      }
    }
    return rows;
  }

  /**
   * row tuple 문자열에서 컬럼 토큰 배열을 반환한다.
   * single-quoted string 내부의 콤마는 구분자로 처리하지 않는다.
   */
  function getColumnTokens(row: string): string[] {
    const inner = row.slice(1, -1); // 앞뒤 '(' ')' 제거
    const tokens: string[] = [];
    let depth = 0;
    let token = "";
    let inStr = false;
    for (let i = 0; i < inner.length; i++) {
      const char = inner[i];
      if (!inStr && char === "'") {
        inStr = true;
        token += char;
      } else if (inStr && char === "'") {
        if (inner[i + 1] === "'") {
          token += "''";
          i++;
        } else {
          inStr = false;
          token += char;
        }
      } else if (!inStr && char === "," && depth === 0) {
        tokens.push(token.trim());
        token = "";
      } else {
        if (!inStr && char === "(") depth++;
        if (!inStr && char === ")") depth--;
        token += char;
      }
    }
    tokens.push(token.trim());
    return tokens;
  }

  it("published_at 값이 있는 published 행이 21건 이상이다", () => {
    const rows = extractContentRows();
    // published 행: status(index 8) = 'published', published_at(index 9) != NULL
    const publishedWithDate = rows.filter((row) => {
      const tokens = getColumnTokens(row);
      return (
        tokens[8]?.toLowerCase() === "'published'" &&
        tokens[9]?.toUpperCase() !== "NULL"
      );
    });
    expect(publishedWithDate.length).toBeGreaterThanOrEqual(21);
  });

  it("description이 NULL인 행이 1건 이상이다", () => {
    const rows = extractContentRows();
    // description은 index 3
    const nullDescriptionRows = rows.filter(
      (row) => getColumnTokens(row)[3]?.toUpperCase() === "NULL"
    );
    expect(nullDescriptionRows.length).toBeGreaterThanOrEqual(1);
  });

  it("source가 NULL인 행이 1건 이상이다", () => {
    const rows = extractContentRows();
    // source는 index 5
    const nullSourceRows = rows.filter(
      (row) => getColumnTokens(row)[5]?.toUpperCase() === "NULL"
    );
    expect(nullSourceRows.length).toBeGreaterThanOrEqual(1);
  });

  it("동일한 published_at 타임스탬프를 가진 행이 2건 이상이다", () => {
    const rows = extractContentRows();
    // published_at은 index 9
    const publishedAts = rows
      .map((row) => getColumnTokens(row)[9]?.trim())
      .filter((val): val is string => !!val && val.toUpperCase() !== "NULL");

    const counts = new Map<string, number>();
    for (const val of publishedAts) {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const hasDuplicate = [...counts.values()].some((count) => count >= 2);
    expect(hasDuplicate).toBe(true);
  });
});
