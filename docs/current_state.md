---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 현재 작업 (2026-09-30)

브랜치: `fix/59-feed-filter-navigation-performance`
이슈 #59 — 메인 피드 카테고리 및 필터 전환 성능 개선

### 완료

- 메인의 섹션·출처·주제·공모전·보기 방식 내부 링크를 Next.js `Link`로 전환해, 필터 변경 시 문서 전체를 다시 불러오지 않고 App Router 내에서 이동하도록 변경
- 로그인 프로필, 피드, 저장 수 조회를 병렬로 시작해 필터 전환의 서버 대기 시간을 축소
- 로컬 데스크톱에서 아티클 → Frontend 주제 필터 전환과 URL 상태(`?section=article&categories=fe`) 확인
- `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build` 통과

## 마지막 작업 (2026-07-29)

브랜치: `fix/44-공모전수집-북마크페이지네이션`
이슈 #44 / PR #45 (base: develop) — **CI 확인 후 squash merge 대기 중**

### 완료

**공모전 수집 유실 수정 (핵심)**
- 원인: `content_items.slug` UNIQUE 제약과 upsert `onConflict: "url"`의 불일치. slug 충돌은 `ON CONFLICT (url)`이 잡지 못해 INSERT 문 전체가 abort되고 해당 소스의 신규 공모전이 통째로 유실됐다
- slug(`wevity-{ix}`)는 고정인데 `url`은 유동적이라 충돌이 상시 발생 (위비티 두 소스가 같은 ix 공유 + 홈페이지 링크가 나중에 붙음)
- insert 전 기존 slug 조회 → insert 대상과 갱신 대상 분리
- 배치 insert 실패 시 행 단위 재시도, 전 행 실패일 때만 소스 실패로 집계
- 배치 내 slug/url 중복 제거
- 기존 공모전의 `url`/`thumbnail`/`deadline` 갱신 (이전에는 thumbnail만, NULL일 때만)

**북마크 저장 목록 200개 캡 제거**
- `getSavedFeed`의 `limit: 200` 제거, 커서 기반 `PAGE_SIZE` 페이지네이션 복귀
- 섹션 탭을 클라이언트 필터링에서 URL query(`?section=saved&saved=<섹션>`)로 전환
- `getSavedCounts` 추가 (탭 배지는 DB 집계값)
- `loadMoreFeed`가 `section='saved'`도 처리
- `BookmarkTabs`를 client → server component로 전환

**dead code 제거 / 문서 동기화**
- 상세 페이지를 만들지 않기로 확정 → `getContentBySlugId`, `lib/slug.ts`, 관련 테스트 제거
- CLAUDE.md, architecture.md, DESIGN.md, roadmap.md 실제 구현과 일치시킴

### 다음 할 일

- **PR #45 CI 확인 후 squash merge → 브랜치 삭제 → `git pull origin develop`**
- **공모전 수정이 실제로 먹는지 프로덕션 확인.** 로컬에 Supabase 자격증명이 없어 `ingestion_runs` 로그를 못 봤다. `vercel login` 후 `vercel env pull`, 또는 배포 후 `/api/cron/ingest` 수동 트리거 → `ingestion_runs.error_message` 확인
- 북마크 섹션 탭 UI를 데스크톱/모바일 viewport에서 직접 확인 (Definition of Done 미충족 항목)
- `MAX_ITEMS_PER_SOURCE = 10` + 하루 1회 크론 조합 재검토. dev.to처럼 발행량 많은 소스는 유실 가능
- `app/api/cron/ingest/{articles,news,contests}` 3개 라우트가 `vercel.json` 크론에서 빠져 있다. 수동 트리거용으로 남길지 정리할지 결정
- `features/ingestion/server/backfill.ts`는 자기 테스트 외 참조 없음 (기존 dead code, 미삭제)
- 관리자 MVP(로드맵 6단계) 전체 미착수. `profiles.role`은 DB에만 존재

### 참고사항

- 공모전의 안정적 식별자는 `url`이 아니라 slug(`wevity-{ix}`)다
- 위비티 두 소스(cidx=20/21)는 같은 ix를 공유하는 항목이 있다 (2026-07-29 실측 2건)
- 위비티 목록/상세 파싱 자체는 정상 동작 확인됨
- 워킹트리에 사용자의 Agent Teams 설정 변경 2건(`CLAUDE.md` 일부, `.claude/agents/conductor.md`)이 미커밋 상태로 남아 있다. 이번 작업과 무관해 PR에 포함하지 않았다
