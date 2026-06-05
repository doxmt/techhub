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
- Supabase project 연결 및 migration push (content_items/categories/tags/profiles + RLS + FTS)
- supabase gen types로 TypeScript 타입 생성, @supabase/ssr 기반 클라이언트 구성
- Vercel project 연결 및 GitHub secrets 등록, CI/CD 정상 동작 확인

## 예정

- seed 데이터 작성 (카테고리 8종, 콘텐츠 10~20건, draft/null썸네일/긴제목 포함)
- 피드 서비스 레이어 구현 (apps/web/features/feed/server/service.ts)
- shadcn/ui 초기화 + 피드 UI 구현 (카드, 검색/필터, 무한 스크롤, 상세 페이지)
- 공개 피드 실데이터 연동 및 E2E 테스트 갱신
- 관리자 로그인/대시보드 MVP 구현

## 참고사항

- `README.md`는 현재 비어 있는 변경 상태다. 명시 요청 없이 되돌리지 않는다.
- plan 파일: `docs/plans/supabase-feed-mvp.md` — 단계 3(서비스 레이어)~5(UI)가 남아 있다.
- seed.sql은 현재 비어 있다. 다음 작업에서 채운다.
- Vercel 프로젝트: songtaehas-projects/techhub, rootDirectory=apps/web, framework=nextjs
- Supabase 프로젝트 ref: yrsjenpwlqtbrqtdwven
