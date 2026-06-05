# 로드맵

이 파일은 TechHub의 전체 구현 순서를 기록한다. `/wrap`으로 덮어쓰지 않는다.

## 구현 순서

1. 프로젝트 scaffold
   - Turborepo + pnpm workspace 구성
   - `apps/web` Next.js App Router 생성
   - `packages/shared` 생성
   - ESLint, Prettier, TypeScript strict, Vitest, Playwright 기본 설정

2. Supabase 기반 설정
   - Supabase CLI 구성
   - SQL migration 작성
   - RLS policy 작성
   - Supabase typegen 구성
   - `@supabase/ssr` 기반 server/client client 구성

3. 공개 피드 MVP
   - 콘텐츠 목록 조회
   - 최신순 정렬
   - URL query 기반 검색/필터
   - Postgres FTS
   - 무한 스크롤
   - 콘텐츠 상세 페이지와 기본 SEO/OG

4. 커뮤니티 피드 UI 전환
   - 공개 피드를 뉴스/아티클 섹션 기반으로 재구성
   - `content_items.section` 추가
   - 섹션, 주제, 언어, 검색 URL query 동기화
   - 콘텐츠 카드와 상세 페이지에 섹션 배지 표시
   - 뉴스 샘플 seed 추가

5. RSS/API 소스 수집 MVP
   - `sources` 테이블 설계
   - RSS/API fetch 및 항목 정규화
   - Vercel Cron Route Handler 구성
   - 중복 URL/slug 처리
   - 수집 실행 결과 로깅

6. 관리자 MVP
   - GitHub OAuth 로그인
   - 이메일 allowlist 기반 관리자 권한
   - 소스 등록/활성화/비활성화
   - 콘텐츠 수정/게시/비공개/삭제
   - 관리자 콘텐츠 테이블

7. 운영/배포
   - Vercel Cron secret 구성
   - 수집 실패 로그 확인 흐름
   - Sentry 구성
   - Vercel Web Analytics 구성
   - GitHub Actions preview/production CI/CD를 pnpm 기준으로 적용
   - Vercel 환경변수와 Supabase secret 연결

8. 품질 보강
   - RLS 테스트
   - RSS/API 파싱 단위 테스트
   - 공개 피드/수집/관리자 플로우 E2E 테스트
   - 모바일/데스크톱 UI 검증

## 완료

- MVP 제품 방향 확정
- 뉴스/아티클 중심 커뮤니티 피드 방향 확정
- 기술스택 선정
- 문서 작성
