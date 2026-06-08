import { parseRssFeed, normalizeItem } from "../parser";
import type { IngestionSource, ContentItemInsert } from "../parser";

export async function fetchRssAtom(
  source: IngestionSource,
  signal: AbortSignal,
): Promise<ContentItemInsert[]> {
  const response = await fetch(source.feed_url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  const items = await parseRssFeed(xml);
  return items
    .filter((item) => item.link)
    .map((item) => normalizeItem(item, source));
}
