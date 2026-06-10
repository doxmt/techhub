export type OgMeta = {
  image: string | null;
  description: string | null;
};

const FETCH_TIMEOUT_MS = 12_000;

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

export function extractOgMeta(html: string): OgMeta {
  const image = extractAttr(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
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

export async function fetchOgMeta(url: string): Promise<OgMeta> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TechHub/1.0 (OG metadata fetcher)" },
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
    return meta;
  } catch {
    return { image: null, description: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
