-- dev.to RSS 소스를 비활성화한다.
--
-- dev.to는 default_language='en'인 유일한 소스로, 뉴스 섹션에 영어 제목 원문
-- 글이 그대로 노출되는 원인이었다. 번역 없이 원문 제목을 그대로 저장하므로
-- 수집을 중단한다.
--
-- 수집 로직/어댑터는 그대로 둔다. 필요해지면 is_active = true로 되돌리면 된다.
-- 기존에 수집된 dev.to 콘텐츠는 그대로 둔다.

UPDATE sources
SET is_active = false
WHERE feed_url = 'https://dev.to/feed';
