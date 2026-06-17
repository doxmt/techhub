export type CursorData = {
  id: number;
  publishedAt?: string;
  countValue?: number;
};

export function encodeCursor(cursor: CursorData): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

export function decodeCursor(encoded: string): CursorData | null {
  if (!encoded) return null;
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof decoded.id === "number"
    ) {
      return decoded as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}
