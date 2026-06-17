export type OgMeta = {
  image: string | null;
  description: string | null;
};

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = "TechHub/1.0 (OG metadata fetcher)";
const WOOWA_FALLBACK_THUMBNAIL =
  "https://i0.wp.com/techblog.woowahan.com/wp-content/uploads/2025/07/%EC%9A%B0%EC%95%84%ED%95%9C%ED%85%8C%ED%81%AC-%EA%B8%B0%EC%88%A0%EB%B8%94%EB%A1%9C%EA%B7%B8-%EB%B0%B0%EB%84%88.png";

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function extractAttr(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlAttr(match[1].trim());
  }
  return null;
}

function jsonLdImageUrl(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const image = jsonLdImageUrl(item);
      if (image) return image;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return jsonLdImageUrl(record.url) ?? jsonLdImageUrl(record.contentUrl);
  }
  return null;
}

function extractJsonLdArticleImage(html: string): string | null {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const script of scripts) {
    if (!script[1]) continue;

    try {
      const parsed = JSON.parse(script[1]);
      const candidates = [
        ...(Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : []),
        parsed,
      ];

      for (const candidate of candidates) {
        const type = candidate?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (!types.includes("Article") && !types.includes("BlogPosting")) continue;

        const image = jsonLdImageUrl(candidate.image);
        if (image) return decodeHtmlAttr(image.trim());
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function extractOgMeta(html: string): OgMeta {
  const articleImage = extractJsonLdArticleImage(html);
  const image = articleImage ?? extractAttr(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']twitter:image["']/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image:src["']/i,
  ]);

  const description = extractAttr(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ]);

  return { image, description };
}

function d2ContentId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "d2.naver.com") return null;
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isWoowaHost(hostname: string | null): boolean {
  return hostname === "techblog.woowahan.com" || hostname === "techblog.woowa.in";
}

function proxiedWoowaImage(src: string, pageUrl: string): string | null {
  try {
    const imageUrl = new URL(decodeHtmlAttr(src.trim()), pageUrl);
    if (!isWoowaHost(imageUrl.hostname)) return null;
    if (!imageUrl.pathname.startsWith("/wp-content/uploads/")) return null;

    return `https://i0.wp.com/techblog.woowahan.com${imageUrl.pathname}${imageUrl.search}`;
  } catch {
    return null;
  }
}

function extractWoowaBodyImage(html: string, pageUrl: string): string | null {
  const images = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);

  for (const image of images) {
    if (!image[1]) continue;

    const proxied = proxiedWoowaImage(image[1], pageUrl);
    if (proxied) return proxied;
  }

  return null;
}

function normalizeSourceThumbnail(pageUrl: string, image: string | null): string | null {
  const pageHost = hostnameOf(pageUrl);
  if (!isWoowaHost(pageHost)) return image;

  const imageHost = image ? hostnameOf(image) : null;
  if (!image || isWoowaHost(imageHost)) return WOOWA_FALLBACK_THUMBNAIL;

  return image;
}

async function fetchD2PostImage(url: string, signal: AbortSignal): Promise<string | null> {
  const id = d2ContentId(url);
  if (!id) return null;

  try {
    const response = await fetch(`https://d2.naver.com/api/v1/contents/${id}`, {
      signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;

    const post = await response.json() as { postImage?: string | null };
    if (!post.postImage) return null;

    return post.postImage.startsWith("http")
      ? post.postImage
      : new URL(post.postImage, "https://d2.naver.com").href;
  } catch {
    return null;
  }
}

export async function fetchOgMeta(url: string): Promise<OgMeta> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return { image: null, description: null };
    const html = await response.text();
    const meta = extractOgMeta(html);
    // 상대경로를 절대경로로 변환
    if (meta.image && !meta.image.startsWith("http")) {
      try {
        meta.image = new URL(meta.image, url).href;
      } catch {
        meta.image = null;
      }
    }
    meta.image ??= await fetchD2PostImage(url, controller.signal);
    if (isWoowaHost(hostnameOf(url))) {
      meta.image = extractWoowaBodyImage(html, url) ?? meta.image;
    }
    meta.image = normalizeSourceThumbnail(url, meta.image);
    return meta;
  } catch {
    return { image: null, description: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
