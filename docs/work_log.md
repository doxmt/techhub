# 작업 로그

이 파일은 완료된 작업 세션의 누적 로그를 기록한다.

## 2026-06-04

- TechHub MVP 제품 방향을 정리했다.
- Vercel + Supabase 기반 기술스택을 확정했다.
- AI 기능과 K8s/GitOps를 MVP 범위에서 제외했다.
- 프로젝트 문서를 템플릿 상태에서 실제 계획 문서로 작성했다.
- Turborepo + pnpm workspace 초기 scaffold를 구성했다.
- `apps/web` Next.js 앱과 `packages/shared` 공용 패키지를 추가했다.
- GitHub Actions preview/production CI/CD workflow를 pnpm 기준으로 추가했다.
- lint, test, typecheck, build, Playwright Chromium E2E를 검증했다.

### 주요 변경 파일

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `apps/web`
- `packages/shared`
- `.github/workflows`
- `docs/prd.md`
- `docs/architecture.md`
- `docs/adr.md`
- `docs/current_state.md`
- `docs/roadmap.md`
- `DESIGN.md`
- `CLAUDE.md`

## 2026-06-05
- GitHub 이슈 #1 생성, feat/1-supabase-setup 브랜치 작업
- Supabase CLI 설치 및 원격 프로젝트 연결 (supabase link)
- DB migration 작성 및 push: content_items/categories/tags/profiles/content_categories/content_tags, RLS, FTS tsvector+GIN, 복합 인덱스
- supabase gen types로 TypeScript 타입 생성, @supabase/ssr 기반 브라우저/서버 클라이언트 구성
- 유틸리티 함수 구현: parseSlugId, encodeCursor/decodeCursor, parseFeedParams (단위 테스트 통과)
- GitHub secrets 등록: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN
- Vercel 프로젝트 연결 및 framework Next.js 설정
- CI/CD (preview + production) 정상 동작 확인, PR #2 develop 머지 완료
