import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../../lib/cursor";

describe("encodeCursor", () => {
  it("publishedAt과 id를 base64 인코딩된 문자열로 반환한다", () => {
    const result = encodeCursor({
      publishedAt: "2024-01-01T00:00:00Z",
      id: 5,
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("decodeCursor", () => {
  it("인코딩된 cursor를 원래 객체로 복원한다", () => {
    const original = { publishedAt: "2024-01-01T00:00:00Z", id: 5 };
    expect(decodeCursor(encodeCursor(original))).toEqual(original);
  });

  it("빈 문자열이면 null을 반환한다", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("유효하지 않은 base64 문자열이면 null을 반환한다", () => {
    expect(decodeCursor("invalid-base64!!!")).toBeNull();
  });

  it("동일한 publishedAt에서 id가 다른 두 cursor는 다른 값을 반환한다", () => {
    const cursorA = encodeCursor({ publishedAt: "2024-01-01T00:00:00Z", id: 1 });
    const cursorB = encodeCursor({ publishedAt: "2024-01-01T00:00:00Z", id: 2 });
    expect(cursorA).not.toBe(cursorB);
  });
});
