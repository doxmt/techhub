-- view_count, likes_count 컬럼 추가
ALTER TABLE content_items
  ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;

-- 기존 likes 데이터로 likes_count 초기화
UPDATE content_items ci
SET likes_count = (
  SELECT COUNT(*) FROM likes l WHERE l.content_id = ci.id
);

-- likes INSERT/DELETE 시 likes_count 자동 동기화
CREATE OR REPLACE FUNCTION sync_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE content_items SET likes_count = likes_count + 1 WHERE id = NEW.content_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE content_items SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.content_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION sync_likes_count();

-- 익명 사용자도 호출 가능한 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_view_count(p_content_id bigint)
RETURNS void AS $$
BEGIN
  UPDATE content_items
  SET view_count = view_count + 1
  WHERE id = p_content_id AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
