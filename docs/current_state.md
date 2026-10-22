---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-10-22)

이슈 #62 — 코엑스 개발 행사 섹션 추가 (`feat/62-coex-event-section` → develop squash merge)

### 완료

- 홈 섹션 탭에 `행사`(`?section=event`) 추가. 종료 전 행사만 시작일 오름차순, 정렬/기간 필터 숨김
- 코엑스 `/event/full-schedules/` 목록 스크래핑 어댑터 `coex` 추가. 오늘~+90일, 최대 8페이지(`COEX_MAX_LIST_PAGES`), 제목 키워드로 개발 행사만 수집
- 새 컬럼 없이 `published_at`=시작일, `deadline`=종료일, `description`=장소 재사용 (ADR-011)
- 카드·미리보기에 행사 기간/장소/`D-n`·`진행중` 배지, 저장됨 탭에 `행사` 하위 탭
- `/api/cron/ingest/events` 수동 트리거 라우트 (vercel.json 크론은 변경 없음, 기존 `/api/cron/ingest`가 함께 수집)
- 로컬에서 실제 코엑스 사이트 대상 어댑터 실행: 개발 행사 7건 추출(소프트웨이브, 컴업, 코리아 테크 페스티벌, AIoT, AI 콘텐츠 페스티벌 등)
- `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build` 통과

### 다음 할 일

- **프로덕션 Supabase에 migration `20261022090000_coex_event_section.sql` 적용** (`supabase db push`). 적용 전에는 수집이 CHECK 제약에 막혀 행사 탭이 비어 있다
- 적용 후 `/api/cron/ingest/events` 수동 트리거 → `ingestion_runs` 결과 확인
- 행사 탭을 데스크톱/모바일 viewport에서 직접 확인 (미실시, Definition of Done 미충족 항목)
- 행사 키워드 오탐/누락 운영 보정, 다른 행사장·플랫폼 확장 여부 결정 (`docs/plans/open-questions.md`)
- 이전부터 남은 항목: `MAX_ITEMS_PER_SOURCE` 재검토, `backfill.ts` dead code, 관리자 MVP 미착수

### 참고사항

- 코엑스 목록 항목은 hover 블록과 본문 블록에 제목이 중복된다. `<li class='BlogPost-item'>` 단위로 파싱한다
- 썸네일 없는 항목은 테마 기본 이미지(`/assets/images/bg/bg-hover*.png`)라 null로 두고 OG 폴백에 맡긴다
- 코엑스 분야 필터(`search_dept=31`, 전기/전자/IT)는 유학박람회가 섞이는 등 부정확해 쓰지 않는다
