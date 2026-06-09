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

## 2026-06-06
- Supabase 원격 이메일 인증 비활성화 (`supabase config push`로 enable_confirmations=false 동기화)
- 피드 북마크 상태 연동: getFeed에 userId 추가, isLoggedIn을 page→FeedInfiniteScroll→ContentCard로 threading
- getSavedFeed 쿼리 수정: bookmarks 테이블에서 content_items 조인 방식으로 변경, isBookmarked:true 설정
- loadMoreFeed Server Action에 현재 유저 ID 조회 추가 (무한 스크롤 페이지도 북마크 상태 반영)
- 미리보기 모달 북마크/추천 버튼 낙관적 업데이트 연동 (비로그인 시 AuthDialog 오픈)
- 리스트뷰(1열) 하트 버튼 제거, 카드에는 북마크만 표시
- 모달 추천 버튼 Heart→ThumbsUp 아이콘, red→amber 색상 변경
- Admin 버튼 조건부 표시: profiles.role='admin'인 유저에게만 노출
- /profile 마이페이지 구현: 닉네임 인라인 수정, 비밀번호 변경(현재 pw 확인), 저장됨 최근 4개 미리보기, 계정 탈퇴(admin client)
- 헤더 드롭다운에 마이페이지 링크 추가
- lib/supabase/admin.ts (service role key 사용 admin client) 추가
- 이슈 #14 제목·내용 갱신, 8개 커밋, PR #15 생성 (closes #14)

## 2026-06-09
- 이슈 #30 생성: 홈 피드에서 아티클과 개발뉴스 섹션 분리
- 홈 섹션 동작 조정: `최신 뉴스`는 개발뉴스 전용 준비중 상태로 두고, 현재 DB의 아티클 콘텐츠는 `아티클` 탭에서만 노출
- 출처와 주제 카테고리 필터를 `아티클` 탭 전용으로 변경하고 다른 섹션으로 이동할 때 `source`, `categories` query를 제거
