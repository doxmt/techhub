-- 코엑스 개발 행사 섹션 (section = 'event')
--
-- 코엑스 일정 목록(HTML)을 수집해 개발자 행사·IT 전시회·세미나를 보여준다.
-- 새 컬럼 없이 기존 컬럼을 재사용한다:
--   published_at = 행사 시작일, deadline = 행사 종료일, description = 장소

ALTER TABLE content_items
  DROP CONSTRAINT IF EXISTS content_items_section_check;

ALTER TABLE content_items
  ADD CONSTRAINT content_items_section_check
  CHECK (section IN ('article', 'news', 'contest', 'event'));

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_section_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_section_check
  CHECK (section IN ('article', 'news', 'contest', 'event'));

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_feed_type_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_feed_type_check
  CHECK (feed_type IN ('rss', 'atom', 'wevity', 'contestkorea', 'coex'));

INSERT INTO sources (name, feed_url, feed_type, default_language, section, is_active)
VALUES (
  '코엑스',
  'https://www.coex.co.kr/event/full-schedules/?list_type=LIST',
  'coex',
  'ko',
  'event',
  true
)
ON CONFLICT (feed_url) DO UPDATE SET
  name = EXCLUDED.name,
  feed_type = EXCLUDED.feed_type,
  section = EXCLUDED.section,
  is_active = EXCLUDED.is_active;
