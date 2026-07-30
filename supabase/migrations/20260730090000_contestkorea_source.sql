-- 공모전 출처를 위비티에서 콘테스트코리아로 교체한다.
--
-- 위비티가 Cloudflare로 데이터센터 IP를 차단(HTTP 403)해 Vercel 크론에서 공모전
-- 수집이 전면 실패했다. 콘테스트코리아는 Cloudflare가 없고 robots.txt도 전체 허용이라
-- 서버에서 정상 수집된다.
--
-- 기존 위비티 콘텐츠는 남겨둔다. 중복 제거 키가 url이라 충돌하지 않는다.

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_feed_type_check;

ALTER TABLE sources
  ADD CONSTRAINT sources_feed_type_check
  CHECK (feed_type IN ('rss', 'atom', 'wevity', 'contestkorea'));

-- 콘테스트코리아 '학문•과학•IT'(Txt_bcode=030310001) 목록.
-- 아이디어 카테고리는 개발 무관 공모전이 대량으로 섞여 제외했다.
INSERT INTO sources (name, feed_url, feed_type, default_language, section, is_active)
VALUES (
  '콘테스트코리아',
  'https://www.contestkorea.com/sub/list.php?displayrow=48&int_gbn=1&Txt_bcode=030310001',
  'contestkorea',
  'ko',
  'contest',
  true
)
ON CONFLICT (feed_url) DO UPDATE SET
  name = EXCLUDED.name,
  feed_type = EXCLUDED.feed_type,
  section = EXCLUDED.section,
  is_active = EXCLUDED.is_active;

-- 위비티 소스는 접근이 막혀 매 실행마다 실패로 기록되므로 비활성화한다.
-- 차단이 풀리면 is_active = true로 되돌리면 된다.
UPDATE sources
SET is_active = false
WHERE feed_type = 'wevity';
