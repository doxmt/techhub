# 아키텍처

## 기술 스택

- 모노레포: Turborepo + pnpm workspace
- 웹 앱: Next.js App Router, TypeScript strict, Node.js runtime
- UI: Tailwind CSS, shadcn/ui, lucide-react, TanStack Table, sonner
- 폼/검증: React Hook Form, Zod
- 데이터/Auth: Supabase Postgres, Supabase Auth, Supabase RLS, `@supabase/ssr`
- DB 관리: Supabase CLI SQL migrations, Supabase CLI typegen
- 검색: Postgres Full Text Search
- 수집: RSS/API `fetch`, 서버 메타데이터 파싱, Vercel Cron
- 환경변수 검증: `@t3-oss/env-nextjs`
- 관측성: Sentry, Vercel Web Analytics
- 테스트: Vitest, Playwright
- 배포: Vercel
- CI/CD: GitHub Actions 템플릿을 pnpm 기준으로 사용

## 디렉토리 구조

```text
.
├── apps
│   └── web
│       ├── app
│       │   ├── [slug-id]/        # 콘텐츠 상세 페이지
│       │   ├── admin/            # 관리자 전용 (role='admin')
│       │   ├── profile/          # 마이페이지 (로그인 필수)
│       │   ├── layout.tsx
│       │   └── page.tsx          # 공개 피드 홈 (출처/카테고리 필터 포함)
│       ├── components
│       │   ├── feed/             # FeedInfiniteScroll, ContentCard, ThumbnailImage 등
│       │   └── ui/               # shadcn/ui 컴포넌트
│       ├── features
│       │   ├── auth/
│       │   │   ├── components/   # AuthDialog, HeaderUserMenu, ProfileClient
│       │   │   └── server/       # actions.ts, profile-actions.ts, schema.ts, service.ts
│       │   ├── feed/
│       │   │   └── server/       # service.ts, actions.ts
│       │   └── ingestion/
│       │       └── server/       # service.ts, parser.ts, classify.ts, backfill.ts, og-scraper.ts
│       ├── lib
│       │   └── supabase/
│       │       ├── client.ts     # 브라우저 클라이언트
│       │       ├── server.ts     # 서버 클라이언트 (anon key)
│       │       ├── middleware.ts # 세션 갱신 헬퍼
│       │       └── admin.ts      # 서버 관리 클라이언트 (service role key)
│       ├── middleware.ts          # Next.js 미들웨어 (세션 갱신)
│       └── tests/
│           ├── unit/
│           └── e2e/
├── packages
│   └── shared
│       └── src
│           ├── index.ts          # CATEGORIES(16개), SOURCES(10개), CategorySlug, Source 타입
│           └── feed-params.ts    # parseFeedParams (categories[], source 파싱/검증)
├── supabase
│   ├── migrations
│   └── seed.sql
├── docs
└── turbo.json
```

## 패턴

- Server Components를 기본으로 사용한다.
- 사용자 입력, 다이얼로그, 폼, 토스트, 무한 스크롤처럼 브라우저 상태가 필요한 부분만 Client Component로 만든다.
- Server Actions를 mutation의 기본 경계로 사용한다.
- Route Handler는 외부 webhook이나 명확한 HTTP API 경계가 필요할 때만 추가한다.
- Supabase 호출과 도메인 로직은 `apps/web/features/*/server`의 service layer에 모은다.
- `packages/shared`에는 타입, 상수, 순수 유틸만 둔다.
- Supabase client, 서버 전용 로직, UI 컴포넌트는 `apps/web` 안에 둔다.
- 권한은 서버 체크와 Supabase RLS를 둘 다 사용한다.
- 관리자 전용 작업(계정 삭제 등)은 `lib/supabase/admin.ts`의 service role client를 사용한다.

## 데이터 흐름

### 공개 피드

```text
사용자 요청
→ Next.js Server Component
→ URL query 파싱 (section, categories[], source, lang, q)
→ feature service (userId 있으면 isBookmarked/isLiked 병합)
→ Supabase Postgres FTS/섹션/카테고리/출처/언어 필터 쿼리
→ published 콘텐츠만 반환
→ 피드 렌더링 (isLoggedIn prop threading)
→ 무한 스크롤로 다음 cursor 요청 (loadMoreFeed에서 유저 세션 조회)
```

### RSS/API 수집

#### 원칙

- 브라우저에서 외부 RSS/API를 직접 fetch하지 않는다.
- 외부 API 키, RSS 파싱, HTML/OG 메타데이터 파싱, 중복 제거 로직은 서버에만 둔다.
- 수집된 콘텐츠는 `content_items`에 저장한 뒤 프론트에 표시한다.
- 공개 피드는 `content_items.status = 'published'`인 데이터만 조회한다.
- 자동 수집된 콘텐츠는 기본적으로 즉시 `published` 상태로 저장한다.
- 관리자는 콘텐츠를 직접 선별 등록하는 역할이 아니라, 소스와 품질을 운영하는 역할이다.
- 관리자는 소스 추가/수정/비활성화, 수집 로그 확인, 잘못된 콘텐츠 숨김/삭제, 카테고리/태그 보정을 수행한다.
- 외부 소스 장애가 있어도 기존 DB 데이터를 기반으로 피드는 계속 동작해야 한다.
- 검색, 필터, 무한 스크롤은 외부 API가 아니라 Supabase에 저장된 정규화 데이터를 기준으로 처리한다.

#### 구현 지침

- 수집 진입점은 `apps/web/app/api/cron/ingest/route.ts` 같은 Route Handler로 둔다.
- 수집 로직은 `apps/web/features/ingestion/server`의 service layer에 둔다.
- 공개 피드 조회 로직은 `apps/web/features/feed/server/service.ts`에 둔다.
- Supabase 클라이언트, 서버 수집기, Route Handler, React 컴포넌트는 `apps/web` 안에 둔다.
- `packages/shared`에는 타입, 상수, 순수 유틸만 둔다.
- 수집 소스는 `sources` 테이블에서 관리한다.
- 수집 실행 결과는 `ingestion_runs`에 기록한다.
- 중복 콘텐츠는 `content_items.url` 기준으로 방지한다.
- 중복 URL 때문에 수집 전체가 실패하지 않도록 upsert 또는 conflict ignore 방식을 사용한다.
- RSS/Atom 수집과 API 기반 수집은 source type별 adapter로 분리한다.
- MVP에서는 AI 요약, AI 추천, AI 태그 생성, 사용자 제출 기능을 넣지 않는다.

#### 흐름

```text
Vercel Cron
→ Next.js Route Handler (CRON_SECRET 검증)
→ sources 테이블에서 활성 소스 조회
→ source type별 adapter로 RSS/Atom fetch
→ 항목 정규화 (title, description, thumbnail, slug, rssCategories carry field)
→ 카테고리 자동 분류: classifyCategories() 가중치 점수 (RSS 10pt / 제목 3pt / 본문 1pt), 최대 3개
→ content_items INSERT (ON CONFLICT url DO NOTHING)
→ content_categories 연결 (1~3개)
→ ingestion_runs에 결과 기록
→ sources.last_ingested_at 갱신
```

### 공개 피드 데이터 표시

#### 원칙

- 프론트 컴포넌트에서 외부 RSS/API URL을 직접 fetch하지 않는다.
- 프론트는 Supabase/백엔드에서 내려온 `content_items` 데이터만 렌더링한다.
- 검색, 필터, 정렬, 무한 스크롤도 백엔드 조회 결과 기준으로 처리한다.
- 외부 소스 파싱, 중복 제거, 썸네일/메타데이터 정규화는 서버에서 처리한다.
- 공개 피드는 `status = 'published'`인 콘텐츠만 표시한다.
- 수집된 콘텐츠는 기본적으로 자동 공개한다.

#### 흐름

```text
외부 RSS/API
→ 백엔드 수집기 (features/ingestion/server)
→ content_items DB 저장
→ features/feed/server/service.ts 조회
→ 프론트 렌더링
```

### 관리자 운영

```text
GitHub OAuth 관리자 로그인
→ 소스/콘텐츠 관리 화면 (profiles.role='admin' 확인)
→ Server Action 또는 Route Handler
→ 관리자 권한 서버 체크
→ Supabase insert/update/delete
→ RLS 최종 권한 검증
→ 관리자 화면 갱신
```

### 인증/권한

```text
이메일/비밀번호 회원가입·로그인
→ Supabase Auth session (이메일 인증 없이 즉시 세션)
→ handle_new_user 트리거 → profiles 자동 생성 (role='viewer')
→ @supabase/ssr 쿠키 기반 session 처리
→ Next.js middleware에서 세션 갱신 (getUser)
→ profiles.role 확인 → 관리자 화면 및 Server Action 접근
→ RLS policy로 DB 쓰기 권한 최종 보장
```

### 마이페이지

```text
로그인 사용자 → /profile
→ Server Component에서 getUser() + profiles 조회
→ 비로그인 시 redirect('/')
→ 닉네임 수정 / 비밀번호 변경: Server Action → Supabase Auth updateUser
→ 계정 탈퇴: Server Action → admin client deleteUser → signOut → redirect('/')
```

## 데이터 모델

- `content_items`: URL, 미디어 타입(`article`/`youtube`), 제목, 설명, 썸네일, 출처, 언어, slug, 게시 상태, 등록일/수정일
- `categories`: 16개 (fe, be, mobile, cloud, data, security, architecture, performance, testing, ml, llm, ai-agents, open-source, tools, career, game)
- `tags`: 자유 태그
- `content_categories`: 콘텐츠와 카테고리 연결 (아티클당 최대 3개)
- `content_tags`: 콘텐츠와 태그 연결
- `bookmarks`: user_id(uuid) + content_id(bigint) 복합 PK, created_at, RLS
- `likes`: user_id(uuid) + content_id(bigint) 복합 PK, created_at, RLS
- `sources`: RSS/API 소스 이름, URL, 소스 타입, 기본 언어, 기본 카테고리, 섹션, 활성 상태, 마지막 수집 시각 (아티클 10개 + 뉴스 5개)
- `ingestion_runs`: 수집 시작/종료 시각, 상태, 처리/생성/스킵/실패 건수, 오류 메시지
- `profiles`: Supabase 사용자 id, 이메일, nickname(최대 20자), role('viewer'|'admin'), created_at

## 분류 원칙

- 공개 UI의 상위 분류는 URL query의 `section`이다.
- UI-first 단계의 섹션은 `news`, `article`, `contest`를 사용한다.
- DB의 `content_items.section` 값으로 `news`와 `article` 피드를 구분한다.
- 기존 콘텐츠와 기존 RSS 소스는 `section='article'`이며, 뉴스 RSS 소스는 `section='news'`로 저장한다.
- `contest`는 준비중 상태로 처리한다.
- 기존 `type`은 콘텐츠 표시 방식이나 원본 미디어를 나타내는 보조 필드로 유지한다.
- 검색/필터 URL query는 `section`, `source`(아티클 섹션 전용), `categories`(아티클 섹션 전용, 콤마구분 최대 3개), `lang`, `q`를 기본으로 사용한다.

## 카테고리 분류 방식

- `classifyCategories({ title, description, rssCategories })` 가중치 점수 방식
- RSS `<category>` 태그: 10점, 제목 키워드: 3점, 본문 키워드: 1점
- 점수 상위 최대 3개 카테고리 반환 (0점이면 미분류)
- 키워드 맵은 `apps/web/features/ingestion/server/classify.ts`에서 관리
- `rssCategories`는 DB 컬럼이 아닌 carry field — insert 전 제거

## 네이밍 규칙

- 파일/디렉토리: kebab-case
- React 컴포넌트: PascalCase
- 함수/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- 타입/인터페이스: PascalCase, `I` 접두사 사용 금지
- Server Action 파일: `actions.ts`
- 서버 service 파일: `service.ts`
- 검증 schema 파일: `schema.ts`
- Supabase migration 파일: `YYYYMMDDHHMMSS_description.sql`

## 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL_ALLOWLIST`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `SENTRY_DSN`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
