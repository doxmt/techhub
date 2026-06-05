export { parseFeedParams } from "./feed-params";

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

export const CATEGORIES = [
  { name: "Frontend", slug: "fe" },
  { name: "Backend", slug: "be" },
  { name: "Cloud", slug: "cloud" },
  { name: "Claude Code", slug: "claude-code" },
  { name: "AI Agents", slug: "ai-agents" },
  { name: "Tools", slug: "tools" },
  { name: "Architecture", slug: "architecture" },
  { name: "Career", slug: "career" },
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONTENT_TYPES = ["article", "youtube"] as const;
export const CONTENT_LANGUAGES = ["ko", "en"] as const;
export const FEED_SECTIONS = [
  "news",
  "article",
  "contest",
  "recommended",
  "saved",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];
export type FeedSection = (typeof FEED_SECTIONS)[number];

export function createSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
