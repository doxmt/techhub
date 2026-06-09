---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-06-09)

### 완료
- 원격 DB 전체 백필 완료 상태 확인: `content_items` 879개, `content_categories` 1903개, 백필 실패 0건
- 홈 카드 UI에서 출처/카테고리/날짜/조회/추천 메타 표시 개선
- 카테고리 필터 시에도 글의 전체 카테고리가 표시되도록 feed service 수정
- 재개 가능한 로컬 백필 스크립트 추가: `apps/web/scripts/backfill-content.mjs`, `.backfill/content-backfill.json`
- 적게 수집되던 3개 소스 adapter 보강
  - 네이버 D2: `/api/v1/contents` API 기반, 현재 후보 753개
  - 토스: `api-public.toss.im` 공개 posts API 기반, 현재 후보 352개
  - 카카오 테크: `/api/v2/posts?code=blog` API 기반, 현재 후보 455개
- 보강된 adapter로 원격 백필 실행 완료
  - 발견 1560건, 처리 1560건, 신규 생성 1510건, 기존 중복 skip 50건, 실패 0건
  - `content_categories` 연결 2861개 추가
- 쿠팡/당근 Medium RSS bundle adapter 추가
  - 쿠팡 엔지니어링: 태그 RSS 조합으로 33건 발견, 신규 23건 생성, 현재 33개
  - 당근마켓: dry-run에서는 64건 발견 확인, 실제 백필에서 Medium 429가 있었지만 5건 추가 생성, 현재 15개

### 다음 할 일
- 적게 수집된 나머지 소스 보강: 당근마켓 추가 재시도, NHN Cloud
- daily ingest 수정
  - `insert` → `upsert(..., { ignoreDuplicates: true })`
  - `ingestion_runs` insert 후 `.select("id")`
  - category insert / `last_ingested_at` update `await`
- 피드 UI 모바일 viewport 직접 확인

### 참고사항
- 네이버 D2/토스/카카오의 기본 RSS는 각각 20/20/10개만 내려오므로 백필은 API adapter를 사용해야 한다.
- dry-run 샘플에서 카카오 일부 글은 현재 `classifyCategories()` 키워드 기준 미분류가 나올 수 있다.
