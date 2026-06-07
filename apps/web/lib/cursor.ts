type CursorData = { publishedAt: string; id: number };

/**
 * cursor 데이터를 base64 인코딩된 문자열로 변환한다.
 */
export function encodeCursor(cursor: CursorData): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

/**
 * base64 인코딩된 문자열을 cursor 데이터로 복원한다.
 * 유효하지 않으면 null을 반환한다.
 */
export function decodeCursor(encoded: string): CursorData | null {
  if (!encoded) return null;
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.publishedAt === "string" &&
      typeof decoded.id === "number"
    ) {
      return decoded as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}
