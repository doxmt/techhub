import {
  CATEGORY_SLUGS,
  CONTENT_LANGUAGES,
  CONTENT_TYPES,
  FEED_SECTIONS,
  SOURCES,
  type CategorySlug,
  type ContentLanguage,
  type ContentType,
  type FeedSection,
  type Source,
} from "./index";

export function parseFeedParams(params: Record<string, unknown>): {
  q?: string;
  categories?: CategorySlug[];
  source?: Source;
  type?: ContentType;
  lang?: ContentLanguage;
  section?: FeedSection;
} {
  const result: {
    q?: string;
    categories?: CategorySlug[];
    source?: Source;
    type?: ContentType;
    lang?: ContentLanguage;
    section?: FeedSection;
  } = {};

  if (typeof params.q === "string" && params.q.length > 0) {
    result.q = params.q;
  }

  // ?categories=fe,be,mobile (쉼표 구분, 최대 3개)
  if (typeof params.categories === "string" && params.categories.length > 0) {
    const parsed = params.categories
      .split(",")
      .map((s) => s.trim())
      .filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s))
      .slice(0, 3) as CategorySlug[];
    if (parsed.length > 0) result.categories = parsed;
  }

  if (
    typeof params.source === "string" &&
    (SOURCES as readonly string[]).includes(params.source)
  ) {
    result.source = params.source as Source;
  }

  if (
    typeof params.type === "string" &&
    (CONTENT_TYPES as readonly string[]).includes(params.type)
  ) {
    result.type = params.type as ContentType;
  }

  if (
    typeof params.lang === "string" &&
    (CONTENT_LANGUAGES as readonly string[]).includes(params.lang)
  ) {
    result.lang = params.lang as ContentLanguage;
  }

  if (
    typeof params.section === "string" &&
    (FEED_SECTIONS as readonly string[]).includes(params.section)
  ) {
    result.section = params.section as FeedSection;
  }

  return result;
}
