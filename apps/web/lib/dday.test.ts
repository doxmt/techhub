import { describe, expect, it } from "vitest";
import { formatDday } from "./dday";

describe("formatDday", () => {
  const NOW = new Date("2026-06-12T03:00:00.000Z"); // KST 2026-06-12 12:00

  it("deadline이 없으면 상시다", () => {
    expect(formatDday(null, NOW)).toEqual({ label: "상시", closed: false });
    expect(formatDday(undefined, NOW)).toEqual({ label: "상시", closed: false });
  });

  it("미래 마감일은 D-n으로 표시한다", () => {
    // KST 2026-06-25 23:59:59
    expect(formatDday("2026-06-25T14:59:59.000Z", NOW)).toEqual({
      label: "D-13",
      closed: false,
    });
  });

  it("오늘 마감(KST 같은 날짜)은 '오늘 마감'으로 표시한다", () => {
    expect(formatDday("2026-06-12T14:59:59.000Z", NOW)).toEqual({
      label: "오늘 마감",
      closed: false,
    });
  });

  it("지난 마감일은 '마감'으로 표시한다", () => {
    expect(formatDday("2026-06-11T14:59:59.000Z", NOW)).toEqual({
      label: "마감",
      closed: true,
    });
  });

  it("유효하지 않은 날짜는 상시로 처리한다", () => {
    expect(formatDday("invalid-date", NOW)).toEqual({
      label: "상시",
      closed: false,
    });
  });
});
