export const CONTENT_CATEGORIES = [
  "FE",
  "BE",
  "Cloud",
  "Claude Code",
  "AI Agents",
  "Tools",
  "Architecture",
  "Career"
] as const;

export const CONTENT_TYPES = ["article", "youtube"] as const;
export const CONTENT_LANGUAGES = ["ko", "en"] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

export function createSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
