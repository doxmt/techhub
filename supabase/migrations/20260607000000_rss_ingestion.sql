-- RSS 수집 파이프라인 마이그레이션
-- 1) content_items.url UNIQUE 제약 추가
-- 2) sources 테이블 생성
-- 3) ingestion_runs 테이블 생성
-- 4) RLS 정책 설정

-- ---------------------------------------------------------------------------
-- content_items.url UNIQUE 제약
-- ---------------------------------------------------------------------------

ALTER TABLE content_items
  ADD CONSTRAINT content_items_url_unique UNIQUE (url);

-- ---------------------------------------------------------------------------
-- sources 테이블
-- ---------------------------------------------------------------------------

CREATE TABLE sources (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                text NOT NULL,
  feed_url            text NOT NULL,
  feed_type           text NOT NULL CHECK (feed_type IN ('rss', 'atom')),
  default_language    text NOT NULL DEFAULT 'ko' CHECK (default_language IN ('ko', 'en')),
  default_category_id bigint REFERENCES categories(id) ON DELETE SET NULL,
  is_active           boolean NOT NULL DEFAULT true,
  last_ingested_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sources_feed_url_unique UNIQUE (feed_url)
);

-- ---------------------------------------------------------------------------
-- ingestion_runs 테이블
-- ---------------------------------------------------------------------------

CREATE TABLE ingestion_runs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id       bigint REFERENCES sources(id) ON DELETE SET NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  status          text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  processed_count int NOT NULL DEFAULT 0,
  created_count   int NOT NULL DEFAULT 0,
  skipped_count   int NOT NULL DEFAULT 0,
  failed_count    int NOT NULL DEFAULT 0,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS: sources
-- ---------------------------------------------------------------------------

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- service role는 RLS를 우회하므로 별도 policy 불필요
-- 익명/인증 사용자에 대한 쓰기 거부 (읽기도 차단)
CREATE POLICY "sources: deny all for anon and authenticated"
  ON sources
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- RLS: ingestion_runs
-- ---------------------------------------------------------------------------

ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingestion_runs: deny all for anon and authenticated"
  ON ingestion_runs
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
