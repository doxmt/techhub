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

## 2026-06-08
- PR #23 (fix/22-rss-thumbnail-category), PR #25 (feat/24-og-backfill) 브랜치가 main 기점으로 잘못 생성된 것 확인
- 두 브랜치를 develop 기준으로 rebase 후 force push
- SKILL.md 브랜치 생성 규칙 수정 (git checkout develop 먼저 명시)
- PR #23 CI 실패 수정 (ArrowUpRight import 누락)
- OG backfill 로컬 실행 시도 → 한국 기술 블로그 대부분 SPA/Medium 403으로 스크래핑 불가 확인
- PR #23, PR #25 develop으로 squash merge 완료

## 2026-06-08
- 카테고리 8개 → 16개로 개편 (mobile, data, security, performance, testing, ml, llm, open-source, game 추가, claude-code 제거)
- 가중치 점수 기반 다중 분류 구현: RSS 태그(10점) > 제목(3점) > 본문(1점), 아티클당 최대 3개 카테고리
- 피드 필터 UI: 출처 단일 선택(`?source=`), 주제 최대 3개 다중 선택(`?categories=fe,be`) 추가
- 한국 기술블로그 소스 3개 추가: NHN Cloud, 데브시스터즈, 올리브영
- DB migration 작성 (20260608120000_update_categories_and_sources.sql)
- PR #27 생성 및 CI 통과 후 머지 완료

## 2026-06-09
- 원격 DB 백필 완료 상태 확인: `content_items` 879개, `content_categories` 1903개, 실패 0건
- 홈 카드 UI를 `아티클 - 출처`, 카테고리 배지, 날짜/조회/추천 메타 중심으로 수정
- 카테고리 필터 시에도 글의 전체 카테고리가 표시되도록 feed service 수정
- 재개 가능한 로컬 백필 스크립트 추가: `apps/web/scripts/backfill-content.mjs`
- 네이버 D2, 토스, 카카오 테크 백필 adapter 보강
  - 네이버 D2: `https://d2.naver.com/api/v1/contents` API 사용 (후보 753개)
  - 토스: `https://api-public.toss.im/api-public/v3/ipd-thor/api/v1/workspaces/15/posts` API 사용 (후보 352개)
  - 카카오 테크: `https://tech.kakao.com/api/v2/posts?code=blog` API 사용 (후보 455개)
- 보강 adapter dry-run 검증: 3개 소스 × 3개 샘플, 처리 9건, 실패 0건
- 보강 adapter 원격 백필 실행 완료: 발견 1560건, 처리 1560건, 신규 생성 1510건, 중복 skip 50건, 실패 0건, 카테고리 연결 2861개 추가
- 쿠팡/당근 Medium RSS bundle adapter 추가
  - dry-run: 쿠팡 34건, 당근 64건 발견
  - 실제 백필: 쿠팡 33건 발견, 신규 23건 생성, 중복 10건 skip, 카테고리 연결 99개 추가
  - 당근은 Medium 429가 있었지만 7건 발견, 신규 5건 생성, 중복 2건 skip, 카테고리 연결 21개 추가
- 이슈 #30 생성: 홈 피드에서 아티클과 개발뉴스 섹션 분리
- 홈 섹션 동작 조정: `최신 뉴스`는 개발뉴스 전용 준비중 상태로 두고, 현재 DB의 아티클 콘텐츠는 `아티클` 탭에서만 노출
- 출처와 주제 카테고리 필터를 `아티클` 탭 전용으로 변경하고 다른 섹션으로 이동할 때 `source`, `categories` query를 제거

## 2026-06-10
- 뉴스 섹션 RSS 수집 계획 구현 시작
- `sources.section`, `content_items.section` migration 추가 및 기존 데이터 기본값 `article` 유지
- 뉴스 RSS 소스 5개 추가: 요즘IT, Techneedle, dev.to, GeekNews, ITWorld Korea
- GeekNews는 `https://news.hada.io/rss/news` Atom feed, ITWorld Korea는 `https://www.itworld.co.kr/feed/` RSS feed로 정상 수집 가능 확인
- ingestion normalize 단계에서 source section을 content item section으로 전파
- feed service를 `content_items.section` 필터 기준으로 전환하고, 홈 `news` placeholder 제거

## 2026-06-12
- 기존 아티클 썸네일 누락 확인: 원격 DB 기준 `section='article'` 2423개 중 `thumbnail IS NULL` 721개
- 최근 썸네일 누락 아티클을 소스별로 확인 후 OG/D2 API/JSON-LD fallback으로 일부 업데이트
- D2 원문 페이지는 SPA shell만 반환해 OG 이미지가 없으므로 `https://d2.naver.com/api/v1/contents/{id}`의 `postImage` fallback 필요 확인
- 우아한형제들은 원본 이미지 도메인이 외부 `<img>`에서 403/timeout으로 깨지는 것을 확인하고, 본문 첫 이미지를 `i0.wp.com` 프록시 썸네일로 우선 보정
- 우아한형제들 기존 513건 중 502건은 본문 이미지 썸네일로 업데이트하고, 본문 이미지를 찾지 못한 11건만 표시 가능한 공용 배너 fallback 유지
- NHN Cloud는 페이지 `og:image`로 보정 가능 확인, 최근 누락 10개 업데이트 후 NHN Cloud 썸네일 누락 0개
- 공용 `fetchOgMeta()`에 D2 API `postImage`, JSON-LD Article image, `property="twitter:image"`, 우아한형제들 표시 가능 썸네일 fallback을 추가해 daily ingest와 OG backfill 모두 신규 썸네일을 더 잘 채우도록 보강
