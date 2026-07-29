---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-07-29)

브랜치: `fix/bookmark-pagination-docs-contest`

### 완료

**북마크 저장 목록 페이지네이션**
- `getSavedFeed`의 `limit: 200` 하드캡 제거. 커서 기반 `PAGE_SIZE` 페이지네이션으로 복귀
- 섹션 탭(전체/최신뉴스/아티클/공모전)을 클라이언트 필터링에서 URL query(`?section=saved&saved=<섹션>`)로 전환
- `getSavedCounts` 추가 — 탭 배지는 로드된 개수가 아니라 DB 집계 개수를 쓴다
- `loadMoreFeed`가 `section='saved'`에서도 다음 페이지를 반환하도록 확장
- `BookmarkTabs`는 client component에서 server component로 전환 (링크 기반이라 상태 불필요)

**공모전 수집 실패 수정**
- 원인: `content_items.slug` UNIQUE 제약과 upsert `onConflict: "url"`의 불일치. slug 충돌은 `ON CONFLICT (url)`이 잡지 못해 INSERT 문 전체가 abort되고 해당 소스의 신규 공모전이 통째로 유실됐다
- insert 전에 기존 slug를 조회해 insert 대상과 갱신 대상을 분리
- 배치 insert가 실패하면 행 단위로 재시도 (한 행이 소스 전체를 죽이지 않도록)
- 같은 배치 안의 slug/url 중복 제거
- 기존 공모전의 `url`/`thumbnail`/`deadline`을 update로 갱신 (이전에는 썸네일만, 그것도 NULL일 때만 채웠다)

**문서 동기화**
- CLAUDE.md: "북마크/좋아요 제외", "로그인은 관리자 전용" 문구를 실제 구현에 맞게 수정
- docs/architecture.md: 디렉토리 구조에서 없는 `[slug-id]/`, `admin/` 제거, `api/cron/`·`bookmarks/` 추가. Sentry·`ADMIN_EMAIL_ALLOWLIST` 미도입 반영. slug UNIQUE 주의사항 추가
- DESIGN.md: `상세 페이지` 섹션을 `콘텐츠 이동`으로 대체 (앱 내부 상세 페이지를 만들지 않기로 확정)
- docs/roadmap.md: 완료/미착수 구분 추가

**dead code 제거**
- `getContentBySlugId`, `lib/slug.ts`(`parseSlugId`), 관련 테스트 — 상세 페이지 전용이라 불필요

### 다음 할 일

- **공모전 수정이 실제로 먹는지 프로덕션에서 확인 필요.** 로컬에 Supabase 자격증명이 없어 `ingestion_runs` 로그를 못 봤다. `vercel login` 후 `vercel env pull`로 확인하거나, 배포 후 `/api/cron/ingest` 수동 트리거 → `ingestion_runs.error_message` 확인
- 북마크 섹션 탭 UI를 데스크톱/모바일 viewport에서 직접 확인 (Definition of Done 항목)
- `MAX_ITEMS_PER_SOURCE = 10` + 하루 1회 크론 조합 재검토. dev.to처럼 발행량 많은 소스는 유실 가능
- `app/api/cron/ingest/{articles,news,contests}` 3개 라우트는 `vercel.json` 크론에서 빠져 있다. 수동 트리거용으로 남길지 정리할지 결정 필요
- `features/ingestion/server/backfill.ts`는 자기 테스트 외 참조 없음 (기존 dead code, 미삭제)

### 참고사항

- 공모전의 안정적 식별자는 `url`이 아니라 slug(`wevity-{ix}`)다. 홈페이지 링크는 등록 후에 붙거나 바뀐다
- 위비티 두 소스(cidx=20/21)는 같은 ix를 공유하는 항목이 실제로 있다 (2026-07-29 실측 2건)
- 위비티 목록/상세 파싱 자체는 정상 동작 확인됨 (3페이지 × 2소스, HTTP 200)
