# 셋업

## 초기 프로젝트 생성 순서

1. Turborepo + pnpm workspace를 구성한다.
2. `apps/web`에 Next.js App Router 프로젝트를 생성한다.
3. `packages/shared`에 공용 타입, 상수, 순수 유틸 패키지를 만든다.
4. TypeScript strict, ESLint, Prettier, Vitest, Playwright를 설정한다.
5. Tailwind CSS와 shadcn/ui를 `apps/web`에 설정한다.
6. Supabase CLI를 설정하고 SQL migration 디렉토리를 만든다.
7. Supabase Auth GitHub OAuth와 이메일 allowlist 기반 관리자 권한을 구성한다.
8. Vercel 프로젝트를 연결하고 preview/production 환경변수를 등록한다.
9. GitHub Actions CI/CD 템플릿을 pnpm 기준으로 적용한다.

## 필수 환경변수

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL_ALLOWLIST=
NEXT_PUBLIC_SITE_URL=
SENTRY_DSN=
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

## 주요 명령어

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm typecheck
```

## Supabase 작업

```bash
pnpm supabase:start
pnpm supabase:db:reset
pnpm supabase:gen-types
```

구현 시 실제 script 이름은 `package.json`에 맞춰 확정한다.

## CI/CD 적용 기준

- Preview 배포: `develop` 대상 pull request
- Production 배포: `main` push
- 템플릿과 실제 workflow는 pnpm 기준이다.
- 검증 순서: install, environment validation, lint, test, build, Vercel deploy
- CI secret에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`가 필요하다.

## 작업 사이클

- 큰 기능은 PR 단위로 진행한다.
- DB 변경은 Supabase SQL migration으로 남긴다.
- UI 변경은 데스크톱과 모바일 viewport에서 확인한다.
- 작업 완료 시 `docs/current_state.md`와 `docs/work_log.md`를 갱신한다.
