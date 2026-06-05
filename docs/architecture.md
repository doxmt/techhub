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
│       ├── components
│       ├── features
│       ├── lib
│       └── tests
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

## 데이터 흐름

### 공개 피드

```text
사용자 요청
→ Next.js Server Component
→ URL query 파싱
→ feature service
→ Supabase Postgres FTS/섹션/주제/언어 필터 쿼리
→ published 콘텐츠만 반환
→ 피드 렌더링
→ 무한 스크롤로 다음 cursor 요청
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
→ 소스/콘텐츠 관리 화면
→ Server Action 또는 Route Handler
→ 관리자 권한 서버 체크
→ Supabase insert/update/delete
→ RLS 최종 권한 검증
→ 관리자 화면 갱신
```

### 인증/권한

```text
GitHub OAuth
→ Supabase Auth session
→ @supabase/ssr 쿠키 기반 session 처리
→ profiles/admin allowlist 확인
→ 관리자 화면 및 Server Action 접근 허용
→ RLS policy로 DB 쓰기 권한 최종 보장
```

## 데이터 모델

- `content_items`: URL, 섹션(`news`/`article`), 미디어 타입(`article`/`youtube`), 제목, 설명, 썸네일, 출처, 언어, slug, 게시 상태, 등록일/수정일
- `categories`: FE, BE, Cloud, Claude Code, AI Agents, Tools, Architecture, Career
- `tags`: 자유 태그
- `content_categories`: 콘텐츠와 카테고리 연결
- `content_tags`: 콘텐츠와 태그 연결
- `sources` (예정): RSS/API 소스 이름, URL, 소스 타입, 기본 섹션, 기본 언어, 활성 상태, 마지막 수집 시각
- `ingestion_runs` (예정): 수집 시작/종료 시각, 상태, 처리/생성/스킵/실패 건수, 오류 메시지
- `profiles`: Supabase 사용자 id, 이메일, role

## 분류 원칙

- 공개 UI의 상위 분류는 `section`이다.
- v1 섹션은 `news`, `article` 두 값만 사용한다.
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
