import { parseRssFeed, normalizeItem } from "../parser";
import type { IngestionSource, ContentItemInsert } from "../parser";

const SINCE_MS = 24 * 60 * 60 * 1000;

export async function fetchRssAtom(
  source: IngestionSource,
  signal: AbortSignal,
): Promise<ContentItemInsert[]> {
  const response = await fetch(source.feed_url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  const items = await parseRssFeed(xml);
  const since = new Date(Date.now() - SINCE_MS);
  return items
    .filter((item) => item.link)
    .filter((item) => {
      if (!item.pubDate) return true;
      const pub = new Date(item.pubDate);
      return !isNaN(pub.getTime()) && pub >= since;
    })
    .map((item) => normalizeItem(item, source));
}
