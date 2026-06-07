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
│       │   └── page.tsx          # 공개 피드 홈
│       ├── components
│       │   ├── feed/             # FeedInfiniteScroll, ContentCard, ContentActions 등
│       │   └── ui/               # shadcn/ui 컴포넌트
│       ├── features
│       │   ├── auth/
│       │   │   ├── components/   # AuthDialog, HeaderUserMenu, ProfileClient
│       │   │   └── server/       # actions.ts, profile-actions.ts, schema.ts, service.ts
│       │   └── feed/
│       │       └── server/       # service.ts, actions.ts
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
→ URL query 파싱
→ feature service (userId 있으면 isBookmarked/isLiked 병합)
→ Supabase Postgres FTS/섹션/주제/언어 필터 쿼리
→ published 콘텐츠만 반환
→ 피드 렌더링 (isLoggedIn prop threading)
→ 무한 스크롤로 다음 cursor 요청 (loadMoreFeed에서 유저 세션 조회)
```

### RSS/API 수집

```text
Vercel Cron
→ Next.js Route Handler
→ CRON_SECRET 검증
→ sources 조회
→ RSS/API fetch
→ 항목 정규화 및 중복 확인
→ content_items upsert
→ 수집 로그 기록
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
- `categories`: FE, BE, Cloud, Claude Code, AI Agents, Tools, Architecture, Career
- `tags`: 자유 태그
- `content_categories`: 콘텐츠와 카테고리 연결
- `content_tags`: 콘텐츠와 태그 연결
- `bookmarks`: user_id(uuid) + content_id(bigint) 복합 PK, created_at, RLS
- `likes`: user_id(uuid) + content_id(bigint) 복합 PK, created_at, RLS
- `sources` (예정): RSS/API 소스 이름, URL, 소스 타입, 기본 섹션, 기본 언어, 활성 상태, 마지막 수집 시각
- `ingestion_runs` (예정): 수집 시작/종료 시각, 상태, 처리/생성/스킵/실패 건수, 오류 메시지
- `profiles`: Supabase 사용자 id, 이메일, nickname(최대 20자), role('viewer'|'admin'), created_at

## 분류 원칙

- 공개 UI의 상위 분류는 URL query의 `section`이다.
- UI-first 단계의 섹션은 `news`, `article`, `contest`를 사용한다.
- 현재 DB에는 별도 section 컬럼을 추가하지 않는다. `news`는 전체 최신순, `article`은 기존 `type='article'`, `contest`는 준비중 상태로 처리한다.
- 기존 `type`은 콘텐츠 표시 방식이나 원본 미디어를 나타내는 보조 필드로 유지한다.
- 검색/필터 URL query는 `section`, `category`, `lang`, `q`를 기본으로 사용한다.

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
