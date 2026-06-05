# 계획: Supabase 기반 설정 + 공개 피드 MVP

> 로드맵 2번(Supabase 기반 설정) + 3번(공개 피드 MVP) 묶음.
> 관리자 OAuth/등록 흐름(로드맵 4번)은 이번 범위에서 제외한다.

## Context

- scaffold 완료 상태: Turborepo + pnpm workspace, `apps/web`(Next.js App Router), `packages/shared`, lint/test/typecheck/build/E2E, CI/CD 기본 골격이 존재한다.
- `apps/web/app/page.tsx`는 하드코딩된 `featuredItems` mock 3건을 렌더한다. Supabase 클라이언트는 없다.
- `supabase/` 디렉토리는 비어 있고 Supabase CLI는 미설치 상태다.
- shadcn/ui는 미초기화다. 현재 Tailwind v4 구성(`@import "tailwindcss"`, `@tailwindcss/postcss`)을 쓰며 `tailwind.config` 파일이 없다.
- E2E `home.spec.ts`는 mock 데이터에 의존하는 하드코딩 selector 2개를 가진다. 실데이터 전환 시 깨진다.
- CI에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` secret만 존재한다. Supabase CLI step이나 Playwright workflow는 없다.

## Goal

원격 Supabase project를 새로 만들어 CLI로 연결하고, 콘텐츠 데이터 모델 + RLS + FTS migration을 작성/push한다. 시드 데이터를 채운 뒤, `@supabase/ssr` 기반 anon 클라이언트와 service layer를 통해 공개 피드를 실데이터로 구동한다. 공개 피드는 최신순 목록, URL query 기반 검색/필터, Postgres FTS, cursor 기반 무한 스크롤, `slug+id` 상세 페이지(SEO/OG)까지 풀 세트로 구현한다. UI는 shadcn/ui를 초기화하고 DESIGN.md의 Linear 톤으로 카드/피드를 작성한다.

## Guardrails

### 반드시 해야 할 것
- 모든 schema 변경은 `supabase/migrations/YYYYMMDDHHMMSS_*.sql`로 작성한다.
- 모든 테이블에 RLS를 enable한다.
- Supabase client, Server Actions, service layer, UI는 `apps/web` 안에 둔다.
- 공개 피드 검색/필터 상태는 URL query에 유지한다.
- 무한 스크롤은 cursor 기반으로 구현한다.
- 피드 조회는 anon 클라이언트만 사용한다.

### 절대 하지 말아야 할 것
- 관리자 OAuth / 쓰기 흐름(등록/수정/게시/삭제)은 이번 범위에서 구현하지 않는다.
- AI 기능, RSS/API 자동 수집, 사용자 제출, 북마크/좋아요를 끼워 넣지 않는다.
- cheerio/메타데이터 수집 코드를 이번 작업에 포함하지 않는다.
- `packages/shared`에 DB client나 React 컴포넌트를 넣지 않는다(타입/상수/순수 유틸만).
- service_role 키를 피드 조회 경로에서 사용하지 않는다.
- Supabase Dashboard에서만 schema를 바꾸고 migration을 남기지 않는 방식을 쓰지 않는다.
- CI migration 자동화(SUPABASE_ACCESS_TOKEN 등 secret 연동)와 E2E CI step 추가는 이번 작업 범위 밖이다.

## Decisions

| # | 항목 | 결정 |
|---|------|------|
| 1 | PK 타입 | `bigint generated always as identity`. URL `slug-id`의 마지막 숫자 분리가 단순하고 UUID 하이픈 파싱 문제가 없다. |
| 2 | cursor | `(published_at DESC, id DESC)` 복합 cursor. 시드 단일 insert로 동일 timestamp가 생겨도 누락/중복이 없다. 인덱스도 복합으로 생성한다. |
| 3 | RLS published 조건 | MVP는 예약 게시가 없으므로 `status = 'published'`로 단순화한다. `published_at`은 정렬 키로만 쓴다. profiles는 anon SELECT 완전 차단. content_categories/content_tags도 join 시 published 필터를 통과해야 한다. |
| 4 | service_role 경계 | 피드 조회는 반드시 anon 클라이언트. admin(service_role) 클라이언트는 이번 범위 미사용(로드맵 4번에서 활용). |
| 5 | FTS | `websearch_to_tsquery`(특수문자/빈 입력 방어) + `simple` config로 ko/en 혼합 처리. 형태소 분석은 후속. |
| 6 | slug+id 라우트 | id가 bigint이므로 URL은 `/[slug]-[id]` 형태. 파싱은 마지막 `-숫자` 분리. slug 불일치 시 id로 조회 후 canonical URL로 301 redirect. |
| 7 | shadcn init 보호 | init 전 커밋으로 baseline 확보 → init 후 `git diff` 검토. `globals.css`는 기존 `@import "tailwindcss"`를 유지하며 shadcn 토큰을 수동 머지. `lib/utils.ts`는 덮어써도 기존 `cn` 유지로 무방. `postcss.config.mjs`는 Tailwind v4 설정을 유지한다. |
| 8 | E2E 갱신 | heading selector는 UI 재작성 후 새 제목으로 갱신. 두 번째 selector는 시드의 결정적 콘텐츠 제목으로 교체. CI E2E step 추가는 Open Questions. |
| 9 | 검색/필터 URL query 계약 | key는 `q`, `category`, `type`, `lang`. 카테고리 다중 선택 불허(MVP 단순화). 필터는 AND 결합. |
| 10 | 무한 스크롤 | 페이지 크기 20, IntersectionObserver 기반, Server Action으로 다음 페이지 fetch. |
| 11 | 다크 테마 | `next-themes` 기반 시스템 자동 따름. 토글 UI는 헤더에 최소 구현. |
| 12 | empty state | 시드 전 / 필터 0건 시 "콘텐츠가 없습니다" 빈 상태 UI. |
| 13 | 썸네일 fallback | NULL일 때 placeholder(회색 배경 + 타입 아이콘) 카드 렌더. |

## Task Flow

### 단계 1 — 원격 Supabase project 생성 및 CLI 연결
- Dashboard에서 새 원격 project 생성(Remote-first, Docker 없이).
- `supabase init` → `supabase login` → `supabase link --project-ref <ref>`.
- 로컬 `.env`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 채움(`@t3-oss/env-nextjs` 스키마 정합 확인).
- **인수 기준**: `supabase link`가 성공하고, `supabase migration list --linked`가 원격과 통신된다. 환경변수 검증을 통과한 상태로 `pnpm dev`가 기동된다.

### 단계 2 — 스키마 + RLS migration 작성 및 원격 push
- `supabase migration new`로 다음을 작성: `content_items`(bigint PK, url/type/title/description/thumbnail/source/language/slug/status/published_at/created_at/updated_at), `categories`, `tags`, `content_categories`, `content_tags`, `profiles`.
- FTS: `content_items`에 `websearch_to_tsquery`/`simple` 기반 tsvector 컬럼 + GIN 인덱스.
- 인덱스: `(published_at DESC, id DESC)` 복합 인덱스.
- 모든 테이블 RLS enable. anon SELECT는 `content_items.status = 'published'`만 허용. profiles는 anon 완전 차단. join 테이블은 published 콘텐츠에만 노출. anon INSERT/UPDATE/DELETE 전면 거부.
- `supabase db push --linked` 후 `supabase gen types --linked --lang typescript > supabase/types.gen.ts`.
- **인수 기준**: `db push`가 원격에 반영되고, 생성된 타입이 typecheck를 통과한다. anon으로 draft SELECT 0건, profiles SELECT 거부/0건, INSERT/UPDATE/DELETE 거부가 확인된다.

### 단계 3 — Supabase 클라이언트 + service layer
- `@supabase/ssr` 기반 server/client client를 `apps/web/lib`에 구성(anon 키).
- `apps/web/features/feed/server/service.ts`에 피드 조회 함수: 최신순 목록, `q/category/type/lang` 필터(AND), FTS 검색, `(published_at, id)` 복합 cursor 페이지네이션(size 20), slug+id 단건 조회.
- 도메인 타입/상수(카테고리 목록, 콘텐츠 타입, 언어, query key)는 `packages/shared`에 둔다.
- **인수 기준**: service 함수가 published만 반환하고, 복합 cursor가 동일 timestamp에서도 중복/누락 없이 순서대로 페이지를 반환한다. FTS가 빈/특수문자 입력에도 throw하지 않는다. 단위 테스트로 cursor 경계와 URL slug 파싱을 검증한다.

### 단계 4 — 시드 데이터 작성 및 적용
- `supabase/seed.sql`에 카테고리 8종(FE/BE/Cloud/Claude Code/AI Agents/Tools/Architecture/Career) 각 최소 1건, 콘텐츠 10~20건(article/youtube 혼합, ko/en 혼합), 태그, content_categories/content_tags 연결.
- draft 최소 1건, 썸네일 NULL 1건, 의도적으로 긴 제목 1건을 포함.
- 원격 적용 후 anon으로 노출 콘텐츠 수 확인.
- **인수 기준**: 시드 적용 후 피드에 published 콘텐츠만 노출되고 draft는 미노출. 카테고리/타입/언어 분포가 위 조건을 만족한다.

### 단계 5 — shadcn/ui 초기화 + 피드/상세 UI
- baseline 커밋 후 `pnpm dlx shadcn@latest init --monorepo -c apps/web`(style `new-york`, `tailwind.config: ""`, `cssVariables: true`). init 후 `git diff`로 globals.css/postcss/lib/utils 수동 검토·머지. `sonner`는 기존 스택이므로 toast 추가 불필요.
- DESIGN.md Linear 톤으로 콘텐츠 카드(썸네일/제목/설명/출처/타입/언어/카테고리·태그/등록일, NULL 썸네일 fallback), 피드 목록, 검색/필터 컨트롤(URL query 동기화), IntersectionObserver 무한 스크롤(Client), empty state, `next-themes` 다크 토글(헤더 최소)을 구현.
- `mock featuredItems`를 실데이터로 교체. `app/[slug-id]` 상세 페이지에 메타정보 + 원문 이동 버튼 + `generateMetadata`(title/description/og:image/canonical), draft 404, slug 불일치 301 redirect.
- `home.spec.ts` selector를 새 heading과 결정적 시드 제목으로 갱신.
- **인수 기준**: 아래 Acceptance Criteria 전체. `pnpm lint/test/build/typecheck` 통과, 데스크톱/모바일 viewport에서 긴 제목/태그 오버플로우 없음 확인.

## Acceptance Criteria

- **RLS 음성 검증**: anon으로 draft SELECT 0건, profiles SELECT 0건/거부, INSERT/UPDATE/DELETE 모두 거부.
- **검색 정확성**: 시드 제목 단어로 검색 시 매칭되고, draft는 어떤 검색어로도 미노출. 빈/특수문자 입력에 throw 없음.
- **무한 스크롤**: 전체 N건이 중복 없이 순서대로 노출되고, 마지막 페이지에서 종료 처리된다.
- **상세 페이지**: `og:title`/`og:description`/`og:image`/`canonical`이 콘텐츠와 일치. draft 상세는 404. slug 불일치 시 canonical로 301 redirect.
- **시드 구성**: 카테고리 8종 각 최소 1건, article/youtube 혼합, ko/en 혼합, draft 최소 1건.
- **필터 계약**: `q/category/type/lang`이 URL query에 유지되고 새로고침/공유 시 복원. 필터는 AND 결합.
- **empty/ fallback**: 0건 필터 결과 시 빈 상태 UI, NULL 썸네일 시 placeholder 카드.
- **반응형**: 모바일에서 의도적으로 긴 제목/태그가 겹치거나 넘치지 않음.
- **품질 게이트**: `pnpm lint/test/build/typecheck` 통과.

## Out of Scope

- 관리자 GitHub OAuth, 이메일 allowlist, URL 등록 폼, cheerio 메타데이터 수집, 수정/게시/비공개/삭제 (로드맵 4번).
- service_role 기반 쓰기 클라이언트.
- AI 기능, RSS/API 자동 수집, 사용자 제출, 북마크/좋아요, 조회수 랭킹.
- CI Supabase migration 자동화 및 Playwright E2E CI step (Open Questions 참고).
- FTS 고도화(pg_trgm, 한국어 형태소).
