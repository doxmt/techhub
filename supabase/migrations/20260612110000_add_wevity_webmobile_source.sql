-- 위비티 웹/모바일/IT 카테고리(cidx=20) 공모전 소스 추가
-- 항목 URL은 ix 기준으로 정규화되므로 게임/소프트웨어(cidx=21)와 겹치는 공모전은 중복 제거된다.

INSERT INTO sources (name, feed_url, feed_type, default_language, section, is_active)
VALUES (
  '위비티 웹/IT',
  'https://www.wevity.com/?c=find&s=1&gub=1&cidx=20',
  'wevity',
  'ko',
  'contest',
  true
)
ON CONFLICT (feed_url) DO UPDATE SET
  name = EXCLUDED.name,
  feed_type = EXCLUDED.feed_type,
  section = EXCLUDED.section,
  is_active = EXCLUDED.is_active;
