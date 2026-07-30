-- 콘테스트코리아 공모전의 published_at을 공고 등록일로 보정한다.
--
-- 어댑터가 published_at에 수집 시각을 넣어(issue #51) 피드 정렬과 카드의 등록일 표시가
-- 잘못됐다. 어댑터는 str_no 앞 8자리를 등록일로 쓰도록 고쳤지만, 이미 들어간 행 중
-- 목록에서 밀려난 항목은 재수집으로 갱신되지 않으므로 slug에서 직접 파생해 보정한다.
--
-- slug 형식: contestkorea-YYYYMMDDnnnn  (앞 13자가 'contestkorea-')

UPDATE content_items
SET published_at = (
  to_timestamp(substring(slug FROM 14 FOR 8), 'YYYYMMDD') AT TIME ZONE 'Asia/Seoul'
)
WHERE section = 'contest'
  AND slug LIKE 'contestkorea-%'
  AND substring(slug FROM 14 FOR 8) ~ '^\d{8}$'
  AND published_at <> (
    to_timestamp(substring(slug FROM 14 FOR 8), 'YYYYMMDD') AT TIME ZONE 'Asia/Seoul'
  );
