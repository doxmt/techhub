/**
 * URL 슬러그에서 마지막 `-숫자` 패턴을 분리해 slug와 id를 반환한다.
 * 유효하지 않으면 null을 반환한다.
 *
 * 예시: "nextjs-tutorial-42" → { slug: "nextjs-tutorial", id: 42 }
 */
export function parseSlugId(
  input: string,
): { slug: string; id: number } | null {
  const match = input.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  return { slug: match[1], id: Number(match[2]) };
}
