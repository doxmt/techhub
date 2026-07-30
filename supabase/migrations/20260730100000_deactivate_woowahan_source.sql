-- 우아한형제들 RSS 소스를 비활성화한다.
--
-- techblog.woowahan.com이 Cloudflare 뒤에 있고 데이터센터 IP를 HTTP 403으로 차단해
-- Vercel 크론에서 2026-06-17 이후 한 건도 수집되지 않았다. 로컬 가정용 IP는 200이지만
-- Vercel·GitHub Actions 모두 403이며, 브라우저 헤더를 갖춰도 통과하지 못한다(issue #52).
--
-- 대체 경로도 없다. feed/atom/과 wp-json은 같은 도메인이라 동일하게 차단되고,
-- woowabros.github.io는 2021년에 이전한 구 블로그다.
--
-- 매 실행 failed로 기록되어 ingestion_runs 상태가 항상 partial이 되는 문제를 없애기 위해
-- 비활성화한다. 차단이 풀리면 is_active = true로 되돌리면 된다.
-- 기존에 수집된 우아한형제들 콘텐츠는 그대로 둔다.

UPDATE sources
SET is_active = false
WHERE feed_url = 'https://techblog.woowahan.com/feed/';
