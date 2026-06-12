import { fetchRssAtom } from "./rss-atom";
import { fetchWevity } from "./wevity";
import type { IngestionSource, ContentItemInsert } from "../parser";

export type FeedAdapter = (
  source: IngestionSource,
  signal: AbortSignal,
) => Promise<ContentItemInsert[]>;

const ADAPTERS: Record<string, FeedAdapter> = {
  rss: fetchRssAtom,
  atom: fetchRssAtom,
  wevity: fetchWevity,
};

export function getAdapter(feedType: string): FeedAdapter {
  const adapter = ADAPTERS[feedType];
  if (!adapter) throw new Error(`Unsupported feed type: ${feedType}`);
  return adapter;
}
