-- =============================================
-- TechHub Initial Schema
-- =============================================

-- profiles 테이블
CREATE TABLE IF NOT EXISTS profiles (
  user_id  uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email    text NOT NULL,
  role     text NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- anon은 profiles를 전혀 볼 수 없다
CREATE POLICY "profiles: anon select denied" ON profiles
  FOR SELECT USING (false);

CREATE POLICY "profiles: anon insert denied" ON profiles
  FOR INSERT WITH CHECK (false);

CREATE POLICY "profiles: anon update denied" ON profiles
  FOR UPDATE USING (false);

CREATE POLICY "profiles: anon delete denied" ON profiles
  FOR DELETE USING (false);

-- =============================================

-- categories 테이블
CREATE TABLE IF NOT EXISTS categories (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text UNIQUE NOT NULL,
  slug       text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: anon select allowed" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories: anon insert denied" ON categories
  FOR INSERT WITH CHECK (false);

CREATE POLICY "categories: anon update denied" ON categories
  FOR UPDATE USING (false);

CREATE POLICY "categories: anon delete denied" ON categories
  FOR DELETE USING (false);

-- =============================================

-- tags 테이블
CREATE TABLE IF NOT EXISTS tags (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: anon select allowed" ON tags
  FOR SELECT USING (true);

CREATE POLICY "tags: anon insert denied" ON tags
  FOR INSERT WITH CHECK (false);

CREATE POLICY "tags: anon update denied" ON tags
  FOR UPDATE USING (false);

CREATE POLICY "tags: anon delete denied" ON tags
  FOR DELETE USING (false);

-- =============================================

-- content_items 테이블
CREATE TABLE IF NOT EXISTS content_items (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url            text NOT NULL,
  type           text NOT NULL CHECK (type IN ('article', 'youtube')),
  title          text NOT NULL,
  description    text,
  thumbnail      text,
  source         text,
  language       text CHECK (language IN ('ko', 'en')),
  slug           text NOT NULL,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  search_vector  tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- anon은 published 콘텐츠만 볼 수 있다
CREATE POLICY "content_items: anon select published" ON content_items
  FOR SELECT USING (status = 'published');

CREATE POLICY "content_items: anon insert denied" ON content_items
  FOR INSERT WITH CHECK (false);

CREATE POLICY "content_items: anon update denied" ON content_items
  FOR UPDATE USING (false);

CREATE POLICY "content_items: anon delete denied" ON content_items
  FOR DELETE USING (false);

-- =============================================

-- content_categories 테이블
CREATE TABLE IF NOT EXISTS content_categories (
  content_id  bigint NOT NULL REFERENCES content_items (id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, category_id)
);

ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_categories: anon select published" ON content_categories
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM content_items WHERE status = 'published'
    )
  );

CREATE POLICY "content_categories: anon insert denied" ON content_categories
  FOR INSERT WITH CHECK (false);

CREATE POLICY "content_categories: anon update denied" ON content_categories
  FOR UPDATE USING (false);

CREATE POLICY "content_categories: anon delete denied" ON content_categories
  FOR DELETE USING (false);

-- =============================================

-- content_tags 테이블
CREATE TABLE IF NOT EXISTS content_tags (
  content_id bigint NOT NULL REFERENCES content_items (id) ON DELETE CASCADE,
  tag_id     bigint NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_tags: anon select published" ON content_tags
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM content_items WHERE status = 'published'
    )
  );

CREATE POLICY "content_tags: anon insert denied" ON content_tags
  FOR INSERT WITH CHECK (false);

CREATE POLICY "content_tags: anon update denied" ON content_tags
  FOR UPDATE USING (false);

CREATE POLICY "content_tags: anon delete denied" ON content_tags
  FOR DELETE USING (false);

-- =============================================
-- 인덱스
-- =============================================

-- 최신순 피드 조회용 복합 인덱스 (published 콘텐츠만)
CREATE INDEX idx_content_items_feed
  ON content_items (published_at DESC, id DESC)
  WHERE status = 'published';

-- FTS 검색용 GIN 인덱스
CREATE INDEX idx_content_items_search_vector
  ON content_items USING GIN (search_vector);

-- status 인덱스
CREATE INDEX idx_content_items_status
  ON content_items (status);

-- =============================================
-- updated_at 자동 업데이트 트리거
-- =============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
