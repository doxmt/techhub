export { parseFeedParams } from "./feed-params";

export const CATEGORIES = [
  { name: "Frontend", slug: "fe" },
  { name: "Backend", slug: "be" },
  { name: "Mobile", slug: "mobile" },
  { name: "Cloud/Infra", slug: "cloud" },
  { name: "Data", slug: "data" },
  { name: "Security", slug: "security" },
  { name: "Architecture", slug: "architecture" },
  { name: "Performance", slug: "performance" },
  { name: "Testing", slug: "testing" },
  { name: "ML/DL", slug: "ml" },
  { name: "LLM/GenAI", slug: "llm" },
  { name: "AI Agents", slug: "ai-agents" },
  { name: "Open Source", slug: "open-source" },
  { name: "Tools", slug: "tools" },
  { name: "Career", slug: "career" },
  { name: "Game", slug: "game" },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as readonly CategorySlug[];

// DB의 content_items.source 값과 일치해야 한다
export const SOURCES = [
  "네이버 D2",
  "카카오 테크",
  "라인 LY",
  "쿠팡 엔지니어링",
  "우아한형제들",
  "당근마켓",
  "토스",
  "NHN Cloud",
  "데브시스터즈",
  "올리브영",
] as const;

export type Source = (typeof SOURCES)[number];

export const NEWS_SOURCES = [
  "요즘IT",
  "Techneedle",
  "dev.to",
  "GeekNews",
  "ITWorld Korea",
] as const;

export type NewsSource = (typeof NEWS_SOURCES)[number];

export const CONTENT_CATEGORIES = CATEGORIES.map((c) => c.name) as unknown as readonly string[];

export const CONTENT_TYPES = ["article", "youtube"] as const;
export const CONTENT_LANGUAGES = ["ko", "en"] as const;
export const FEED_SECTIONS = [
  "news",
  "article",
  "contest",
  "recommended",
  "saved",
] as const;

export type ContentCategory = (typeof CATEGORIES)[number]["name"];
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
