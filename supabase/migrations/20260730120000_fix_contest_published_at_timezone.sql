-- 20260730110000_backfill_contest_published_at.sql의 시간대 변환 오류를 바로잡는다.
--
-- 이전 migration은 다음과 같이 썼다.
--   to_timestamp('20260723', 'YYYYMMDD') AT TIME ZONE 'Asia/Seoul'
--
-- to_timestamp()는 이미 timestamptz를 반환하므로(세션 TZ가 UTC이면 2026-07-23T00:00Z),
-- 여기에 AT TIME ZONE을 적용하면 "그 시각의 서울 로컬 naive 시각"(2026-07-23 09:00)이
-- 나오고, timestamptz 컬럼에 넣을 때 다시 UTC로 해석되어 18시간이 밀렸다.
--
-- 올바른 방향은 naive timestamp를 서울 시간으로 '해석'하는 것이다.
--   '20260723'::date::timestamp AT TIME ZONE 'Asia/Seoul'  →  2026-07-22T15:00:00Z
--
-- slug 형식: contestkorea-YYYYMMDDnnnn  (앞 13자가 'contestkorea-')

UPDATE content_items
SET published_at = (
  (substring(slug FROM 14 FOR 8)::date)::timestamp AT TIME ZONE 'Asia/Seoul'
)
WHERE section = 'contest'
  AND slug LIKE 'contestkorea-%'
  AND substring(slug FROM 14 FOR 8) ~ '^\d{8}$'
  AND published_at IS DISTINCT FROM (
    (substring(slug FROM 14 FOR 8)::date)::timestamp AT TIME ZONE 'Asia/Seoul'
  );
