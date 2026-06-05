import {
  CONTENT_LANGUAGES,
  CONTENT_TYPES,
  type ContentLanguage,
  type ContentType,
} from "./index";

export function parseFeedParams(params: Record<string, unknown>): {
  q?: string;
  category?: string;
  type?: ContentType;
  lang?: ContentLanguage;
} {
  const result: {
    q?: string;
    category?: string;
    type?: ContentType;
    lang?: ContentLanguage;
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

  return result;
}
