import { describe, expect, it } from "vitest";
import { formatDday, formatEventPeriod, formatEventStatus } from "./dday";

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

describe("formatEventPeriod", () => {
  it("KST 기준 'MM.DD – MM.DD'로 표시한다", () => {
    // 2026-12-09 00:00 KST ~ 2026-12-11 23:59:59 KST
    expect(
      formatEventPeriod("2026-12-08T15:00:00.000Z", "2026-12-11T14:59:59.999Z"),
    ).toBe("12.09 – 12.11");
  });
});

describe("formatEventStatus", () => {
  const START = "2026-12-08T15:00:00.000Z"; // KST 2026-12-09 00:00
  const END = "2026-12-11T14:59:59.999Z"; // KST 2026-12-11 23:59:59

  it("시작 전이면 시작일까지 D-n이다", () => {
    // KST 2026-12-02 12:00
    expect(formatEventStatus(START, END, new Date("2026-12-02T03:00:00.000Z"))).toEqual({
      label: "D-7",
      closed: false,
    });
  });

  it("시작일 당일이거나 기간 중이면 진행중이다", () => {
    expect(formatEventStatus(START, END, new Date("2026-12-08T15:00:00.000Z"))).toEqual({
      label: "진행중",
      closed: false,
    });
    expect(formatEventStatus(START, END, new Date("2026-12-10T03:00:00.000Z"))).toEqual({
      label: "진행중",
      closed: false,
    });
  });

  it("종료 후에는 종료로 표시한다", () => {
    expect(formatEventStatus(START, END, new Date("2026-12-12T00:00:00.000Z"))).toEqual({
      label: "종료",
      closed: true,
    });
  });
});
