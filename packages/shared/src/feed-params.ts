import {
  CONTENT_LANGUAGES,
  CONTENT_TYPES,
  FEED_SECTIONS,
  type ContentLanguage,
  type ContentType,
  type FeedSection,
} from "./index";

export function parseFeedParams(params: Record<string, unknown>): {
  q?: string;
  category?: string;
  type?: ContentType;
  lang?: ContentLanguage;
  section?: FeedSection;
} {
  const result: {
    q?: string;
    category?: string;
    type?: ContentType;
    lang?: ContentLanguage;
    section?: FeedSection;
  } = {};

  if (typeof params.q === "string" && params.q.length > 0) {
    result.q = params.q;
  }

  if (typeof params.category === "string" && params.category.length > 0) {
    result.category = params.category;
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
