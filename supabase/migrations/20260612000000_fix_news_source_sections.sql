-- Ensure news sources and already-ingested rows stay out of the article section.

UPDATE sources
SET section = 'news'
WHERE feed_url IN (
  'https://yozm.wishket.com/magazine/feed/',
  'https://techneedle.com/feed',
  'https://dev.to/feed',
  'https://news.hada.io/rss/news',
  'https://www.itworld.co.kr/feed/'
);

DELETE FROM content_items
WHERE source = 'dev.to'
AND section = 'article';

UPDATE content_items
SET section = 'news'
WHERE source IN (
  '요즘IT',
  'Techneedle',
  'GeekNews',
  'ITWorld Korea'
)
AND section <> 'news';

UPDATE ingestion_runs
SET
  status = 'failed',
  finished_at = COALESCE(finished_at, started_at),
  error_message = COALESCE(error_message, 'Marked failed after cron timeout left the run open.')
WHERE status = 'running';
