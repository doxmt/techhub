const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DdayInfo = {
  label: string;
  closed: boolean;
};

/**
 * 공모전 마감일을 D-day 라벨로 변환한다.
 * deadline이 없거나 유효하지 않으면 상시 모집으로 취급한다.
 */
export function formatDday(
  deadline: string | null | undefined,
  now = new Date(),
): DdayInfo {
  if (!deadline) return { label: "상시", closed: false };

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return { label: "상시", closed: false };

  if (deadlineDate.getTime() < now.getTime()) {
    return { label: "마감", closed: true };
  }

  // KST 날짜 기준 일수 차이
  const kstDay = (date: Date) =>
    Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS);
  const diff = kstDay(deadlineDate) - kstDay(now);

  return { label: diff === 0 ? "오늘 마감" : `D-${diff}`, closed: false };
}
