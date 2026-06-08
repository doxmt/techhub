-- Seed data for TechHub MVP
-- Categories

INSERT INTO categories (name, slug) VALUES
  ('Frontend', 'fe'),
  ('Backend', 'be'),
  ('Cloud', 'cloud'),
  ('Claude Code', 'claude-code'),
  ('AI Agents', 'ai-agents'),
  ('Tools', 'tools'),
  ('Architecture', 'architecture'),
  ('Career', 'career')
ON CONFLICT (slug) DO NOTHING;

-- Tags

INSERT INTO tags (name) VALUES
  ('React'),
  ('TypeScript'),
  ('Next.js'),
  ('PostgreSQL'),
  ('Docker')
ON CONFLICT (name) DO NOTHING;

-- Sources (RSS 수집 소스)

INSERT INTO sources (name, feed_url, feed_type, default_language, default_category_id) VALUES
  ('네이버 D2',       'https://d2.naver.com/d2.atom',                          'atom', 'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('카카오 테크',     'https://tech.kakao.com/feed/',                           'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('라인 LY',         'https://techblog.lycorp.co.jp/ko/feed/index.xml',        'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('쿠팡 엔지니어링', 'https://medium.com/feed/coupang-engineering',            'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('우아한형제들',    'https://techblog.woowahan.com/feed/',                    'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('당근마켓',        'https://medium.com/feed/daangn',                         'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be')),
  ('토스',            'https://toss.tech/rss.xml',                              'rss',  'ko', (SELECT id FROM categories WHERE slug = 'be'))
ON CONFLICT (feed_url) DO NOTHING;
