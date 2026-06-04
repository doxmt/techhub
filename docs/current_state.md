# 현재 상태

이 파일은 TechHub 프로젝트의 최신 작업 상태를 기록한다.

## 완료

- 제품 방향 확정: 관리자 큐레이션 기반 개발 아티클/유튜브 공개 피드
- MVP 스택 확정: Vercel + Supabase
- 앱 구조 확정: Turborepo + pnpm workspace
- 웹 기술 확정: Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui
- 데이터/Auth 확정: Supabase Postgres, Supabase Auth GitHub OAuth, RLS
- MVP 제외 범위 확정: AI 기능, K8s/GitOps, RSS 자동 수집, 사용자 제출, 북마크/좋아요
- 프로젝트 문서 초안 작성
- Turborepo + pnpm workspace 초기 scaffold 완료
- `apps/web` Next.js 앱과 `packages/shared` 패키지 생성
- 기본 lint/test/typecheck/build/E2E 설정 완료
- GitHub Actions preview/production CI/CD workflow를 pnpm 기준으로 추가

## 예정

- Supabase project 연결 및 local migration 구성
- 기본 schema, RLS policy, typegen 구성
- 공개 피드와 관리자 로그인/대시보드 MVP 구현
- Vercel project 연결 및 secrets 등록
- shadcn/ui 실제 컴포넌트 초기화

## 참고사항

- `README.md`는 현재 비어 있는 변경 상태다. 사용자가 의도적으로 비웠을 수 있으므로 명시 요청 없이 되돌리지 않는다.
- CI/CD 템플릿과 실제 workflow는 pnpm 기준으로 수정되어 있다.
- 일반 사용자는 로그인하지 않는다. MVP에서 로그인은 관리자 전용이다.
- AI 기능은 schema 확장 가능성만 고려하고 기능으로 구현하지 않는다.
- Next.js/Turbopack build는 sandbox 포트 제한 때문에 승인된 환경에서 검증해야 한다.
