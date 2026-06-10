-- =============================================
-- News section support
-- =============================================

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'article'
  CHECK (section IN ('article', 'news'));

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'article'
  CHECK (section IN ('article', 'news'));

CREATE INDEX IF NOT EXISTS idx_content_items_section_feed
  ON content_items (section, published_at DESC, id DESC)
  WHERE status = 'published';

INSERT INTO sources (name, feed_url, feed_type, default_language, section, is_active)
VALUES
  ('요즘IT',        'https://yozm.wishket.com/magazine/feed/',      'rss', 'ko', 'news', true),
  ('Techneedle',    'https://techneedle.com/feed',                 'rss', 'ko', 'news', true),
  ('dev.to',        'https://dev.to/feed',                         'rss', 'en', 'news', true),
  ('GeekNews',      'https://news.hada.io/rss/news',               'atom', 'ko', 'news', true),
  ('ITWorld Korea', 'https://www.itworld.co.kr/feed/',             'rss', 'ko', 'news', true)
ON CONFLICT (feed_url) DO UPDATE
SET
  name = EXCLUDED.name,
  feed_type = EXCLUDED.feed_type,
  default_language = EXCLUDED.default_language,
  section = EXCLUDED.section,
  is_active = EXCLUDED.is_active;
