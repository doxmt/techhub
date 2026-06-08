-- =============================================
-- 카테고리 개편: 8개 → 16개
-- claude-code 제거, mobile/data/security/performance/testing/ml/llm/open-source/game 추가
-- =============================================

-- 기존 content_categories 연결 삭제 (재수집 시 새 카테고리로 재분류됨)
DELETE FROM content_categories;

-- 기존 카테고리 전체 삭제
DELETE FROM categories;

-- 새 카테고리 16개 삽입
INSERT INTO categories (name, slug) VALUES
  ('Frontend',     'fe'),
  ('Backend',      'be'),
  ('Mobile',       'mobile'),
  ('Cloud/Infra',  'cloud'),
  ('Data',         'data'),
  ('Security',     'security'),
  ('Architecture', 'architecture'),
  ('Performance',  'performance'),
  ('Testing',      'testing'),
  ('ML/DL',        'ml'),
  ('LLM/GenAI',    'llm'),
  ('AI Agents',    'ai-agents'),
  ('Open Source',  'open-source'),
  ('Tools',        'tools'),
  ('Career',       'career'),
  ('Game',         'game')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- =============================================
-- sources 기존 default_category_id 갱신
-- (모든 소스의 기본 카테고리를 'be'로 유지)
-- =============================================
UPDATE sources
SET default_category_id = (SELECT id FROM categories WHERE slug = 'be')
WHERE default_category_id IS NOT NULL;

-- =============================================
-- 신규 소스 3개 추가
-- =============================================
INSERT INTO sources (name, feed_url, feed_type, default_language, default_category_id, is_active)
VALUES
  ('NHN Cloud',   'https://meetup.nhncloud.com/rss',        'rss', 'ko', (SELECT id FROM categories WHERE slug = 'cloud'), true),
  ('데브시스터즈', 'https://tech.devsisters.com/rss.xml',    'rss', 'ko', (SELECT id FROM categories WHERE slug = 'be'),    true),
  ('올리브영',    'https://oliveyoung.tech/rss.xml',         'rss', 'ko', (SELECT id FROM categories WHERE slug = 'be'),    true)
ON CONFLICT (feed_url) DO NOTHING;
