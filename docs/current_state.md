---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-06-10)

### 완료
- `sources.section`, `content_items.section`을 추가하는 뉴스 섹션 migration 작성
- 뉴스 RSS 소스 5개 추가: 요즘IT, Techneedle, dev.to, GeekNews, ITWorld Korea
- RSS ingestion에서 source section을 content_items section으로 전파하도록 수정
- 공개 피드 조회를 `content_items.section` 기준으로 필터링하도록 수정
- 홈 `최신 뉴스` placeholder를 제거하고 실제 `news` 피드 조회 경로로 연결
- 뉴스 소스 상수 `NEWS_SOURCES` 추가
- daily ingest 안정화: 신규 콘텐츠 upsert count 명시, 카테고리 연결과 `last_ingested_at` 갱신을 함수 종료 전에 await
- daily ingest를 뉴스/아티클 cron route로 분리하고 함수 최대 실행 시간을 60초로 지정
- 뉴스 소스 기존 콘텐츠 보정 migration 추가: dev.to article 오등록분 삭제, 다른 뉴스 소스 article 오등록분은 `news`로 보정, stale running run은 failed 처리

### 다음 할 일
- Supabase migration 적용 후 타입 파일은 실제 원격/로컬 DB 기준으로 재생성 권장
- Cron 수동 트리거로 `section='news'` 콘텐츠 수집 확인
- 피드 UI 모바일 viewport 직접 확인

### 참고사항
- 기존 DB 콘텐츠는 migration 기본값으로 `section='article'`이 된다.
- `type`은 미디어 타입(`article`/`youtube`)으로 유지하고, 뉴스/아티클 같은 상위 섹션과 혼용하지 않는다.
- GeekNews는 `https://news.hada.io/rss/news` Atom feed, ITWorld Korea는 `https://www.itworld.co.kr/feed/` RSS feed를 사용한다.
- 네이버 D2/토스/카카오의 기본 RSS는 각각 20/20/10개만 내려오므로 백필은 API adapter를 사용해야 한다.
