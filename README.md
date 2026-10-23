# TechHub

개발 뉴스 · 아티클 · 공모전을 한 곳에서 훑는 **개발자용 정보 허브.**

매번 여기저기 흩어진 사이트를 돌아다니며 찾던 걸 하나로 모았다. 첫 화면은 마케팅 랜딩이 아니라 **바로 피드**다 — 탭으로 전환하고, 필터와 검색으로 좁혀 빠르게 스캔하는 도구를 지향한다.

## 기능

- **세 가지 소스 통합** — 개발 뉴스 / 개발 아티클 / 공모전
- **자동 수집** — RSS·스크래핑으로 매일 수집. 원문 링크와 썸네일(OG 이미지)까지
- **필터 · 검색** — 출처·카테고리 필터, Postgres 전문검색(FTS) 기반 검색
- **공모전 관리** — 진행중/종료 상태, 유형별 분류, 등록일 정렬
- **북마크 · 좋아요 · 조회수**
- **무한 스크롤**
- 라이트 / 다크 테마

## 기술 스택

| | |
|---|---|
| **모노레포** | Turborepo + pnpm workspace (`apps/web`, `packages/shared`) |
| **프론트** | Next.js (App Router) · TypeScript · Tailwind CSS |
| **백엔드** | Supabase (Postgres · RLS · Full-Text Search) |
| **배포** | Vercel |
| **테스트** | Playwright (E2E) |

## 구조

```
apps/web/          Next.js 앱
  app/             라우트 (피드, 프로필)
  api/cron/        수집 크론 엔드포인트
  features/        도메인별 기능
  components/
packages/shared/   공유 타입·유틸
supabase/
  migrations/      스키마 · RLS 정책 · FTS 인덱스
  types.gen.ts     DB 타입 자동 생성
```

## 데이터 수집

Vercel Cron으로 하루 두 번 돈다.

| 경로 | 시각(UTC) | 하는 일 |
|---|---|---|
| `/api/cron/ingest` | 01:00 | 뉴스 · 아티클 · 공모전 수집 |
| `/api/cron/backfill-og` | 02:00 | 썸네일(OG 이미지) 백필 |

Vercel 무료 플랜의 크론 개수 제한 때문에 **수집을 하나로 합치고 썸네일 백필만 분리**했다.

## 검색

`content_items.search_vector`를 `tsvector` generated column으로 두고 GIN 인덱스를 걸었다.
제목과 설명을 합쳐 색인하며, 출처(source)도 색인 대상에 포함한다.

## 로컬 실행

```bash
pnpm install
pnpm dev
```

Supabase 프로젝트 URL과 키를 환경변수로 넣어야 한다. 자세한 건 `docs/setup.md` 참고.

## 문서

| 파일 | 내용 |
|---|---|
| `docs/prd.md` | 제품 요구사항 |
| `docs/architecture.md` | 구조 |
| `docs/adr.md` | 설계 결정 기록 |
| `docs/roadmap.md` | 로드맵 |
| `docs/current_state.md` | 현재 상태 |
| `docs/work_log.md` | 작업 로그 |
| `DESIGN.md` | 디자인 방향 |
