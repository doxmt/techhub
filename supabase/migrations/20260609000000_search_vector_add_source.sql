-- search_vector에 source 필드 추가
-- "네이버"만 입력해도 "네이버 D2" 출처의 아티클이 검색되도록 개선

ALTER TABLE content_items DROP COLUMN search_vector;

ALTER TABLE content_items
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(source, '')
    )
  ) STORED;

CREATE INDEX idx_content_items_search_vector
  ON content_items USING GIN (search_vector);
