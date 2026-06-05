# 현재 상태

이 파일은 TechHub 프로젝트의 최신 작업 상태를 기록한다.

## 완료

- 제품 방향 확정: 개발 뉴스와 아티클 중심 개발자 커뮤니티 피드
- MVP 스택 확정: Vercel + Supabase
- 앱 구조 확정: Turborepo + pnpm workspace
- 웹 기술 확정: Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui
- 데이터/Auth 확정: Supabase Postgres, Supabase Auth GitHub OAuth, RLS
- MVP 제외 범위 확정: AI 기능, K8s/GitOps, 사용자 제출, 북마크/좋아요
- 프로젝트 문서 초안 작성
- Turborepo + pnpm workspace 초기 scaffold 완료
- `apps/web` Next.js 앱과 `packages/shared` 패키지 생성
- 기본 lint/test/typecheck/build/E2E 설정 완료
- GitHub Actions preview/production CI/CD workflow를 pnpm 기준으로 추가
- Supabase project 연결 및 migration push (content_items/categories/tags/profiles + RLS + FTS)
- supabase gen types로 TypeScript 타입 생성, @supabase/ssr 기반 클라이언트 구성
- Vercel project 연결 및 GitHub secrets 등록, CI/CD 정상 동작 확인
- 제품 구조 변경 계획 확정: 공개 UI는 뉴스/아티클 섹션 기반 커뮤니티 피드로 전환하고, RSS/API 자동 수집은 후속 단계로 구현
- seed 데이터 작성 PR #4 머지 (카테고리 8종, 콘텐츠 15건)
- Vercel 중복 프로젝트(techhub-web) 삭제, Ignored Build Step exit 0으로 자동 배포 차단
- .gitignore 정리 (Thumbs.db, .idea/, playwright/.auth/ 추가, 중복 .vercel 제거)
- git remote URL TechHub -> techhub(소문자)로 수정
- PR #6 오픈: 피드 서비스 레이어 (seed 보완, CATEGORIES 상수, getFeed/getContentBySlugId/loadMoreFeed, 테스트 54개)
- PR #8 오픈: 피드 UI (shadcn/ui 6개, ContentCard/FeedInfiniteScroll/FeedFilters, 실데이터 연결, 상세 페이지, 테스트 66개)
- PR #6, #8 머지 완료
- 이슈 #9 생성: Public feed E2E 검증 및 원격 seed 적용
- 원격 Supabase seed 적용 완료 (categories 8, tags 5, content_items 23, published 21)
- Public feed 단계 6 E2E 검증 완료: 2페이지 로드, 필터/검색 URL 동기화, 상세 308/404
- 검증 통과: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm typecheck`, `pnpm test:e2e`

## 예정

- 관리자 로그인/대시보드 MVP 구현
- RSS/API 소스 수집 MVP 설계 및 구현

## 참고사항

- `README.md`는 현재 비어 있는 수정 상태다. 명시 요청 없이 되돌리지 않는다.
- plan 파일: `docs/plans/public-feed-mvp.md` (로컬 전용, gitignore됨) — Public feed MVP 단계 6까지 완료
- RSS/API 자동 수집은 아직 미구현이다. 기본 방향은 `sources` 테이블 + Vercel Cron + Next.js Route Handler이며, 수집 콘텐츠는 우선 자동 게시로 둔다.
- Vercel 프로젝트: songtaehas-projects/techhub, rootDirectory=apps/web, framework=nextjs
- Supabase 프로젝트 ref: yrsjenpwlqtbrqtdwven
