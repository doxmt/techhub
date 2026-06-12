-- Contest section support
-- content_items.section에 'contest'를 허용하고 공모전 전용 필드를 추가한다.
-- sources에 'wevity' 수집 타입과 공모전 소스를 추가한다.

ALTER TABLE content_items
  DROP CONSTRAINT IF EXISTS content_items_section_check;

ALTER TABLE content_items
  ADD CONSTRAINT content_items_section_check
  CHECK (section IN ('article', 'news', 'contest'));

-- 마감일: NULL이면 상시 모집으로 취급한다 (항상 '진행중')
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS deadline timestamptz;

-- 공모전 유형: 공모전(section='contest') 콘텐츠에만 사용한다
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS contest_type text
  CHECK (
    contest_type IS NULL
    OR contest_type IN ('hackathon', 'dev-contest', 'idea-contest', 'data-competition')
  );

CREATE INDEX IF NOT EXISTS idx_content_items_contest_deadline
  ON content_items (deadline, id DESC)
  WHERE section = 'contest';

-- sources: wevity HTML 목록 수집 타입과 contest 섹션 허용
ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_feed_type_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_feed_type_check
  CHECK (feed_type IN ('rss', 'atom', 'wevity'));

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_section_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_section_check
  CHECK (section IN ('article', 'news', 'contest'));

INSERT INTO sources (name, feed_url, feed_type, default_language, section, is_active)
VALUES (
  '위비티',
  'https://www.wevity.com/?c=find&s=1&gub=1&cidx=21',
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
