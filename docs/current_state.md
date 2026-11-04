---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-11-04): TechHub Neon 이전

### 완료

- Vercel 관리형 Neon 무료 프로젝트 `techhub-db` 생성 및 TechHub Preview/Production 연결.
- Supabase의 콘텐츠, 카테고리, 소스, 수집 기록, 계정별 북마크·좋아요를 Neon으로 복사. 기존 사용자 UUID 3개와 bcrypt 비밀번호 해시도 Better Auth로 이전해 기존 비밀번호를 유지한다.
- 운영 사이트 `https://techhub-lyart.vercel.app`를 Neon으로 전환. 공개 뉴스·아티클·공모전·검색, 운영 환경 회원가입·로그인·마이페이지·저장 피드, 로컬 수집 작업을 확인했다.
- 계정별 테이블은 제한된 `techhub_app` 역할과 RLS 정책으로 보호한다. 임시 사용자와 임시 인증 해시 파일은 테스트 후 삭제했다.
- 전체 테스트 388개, 린트, 타입 검사, 빌드 통과. Neon DB 크기 약 120 MB.
- `feat/neon-migration` 브랜치의 Neon 이전 코드를 원격 저장소에 푸시했다. Supabase의 TechHub 프로젝트(`yrsjenpwlqtbrqtdwven`)는 Neon 운영 및 데이터 확인 후 영구 삭제했다.

### 다음 할 일

- 기존 로그인 세션은 인증 공급자 변경으로 다시 로그인해야 한다. 계정의 비밀번호는 유지된다.
- `apps/web/scripts/backfill-content.mjs`와 기존 Supabase fallback 코드는 이전 관리용으로 남아 있다. 운영 경로는 `DATABASE_URL`을 사용해 Neon으로 동작한다.
- 배포 환경의 예약 수집은 다음 실행 후 결과를 확인한다.

### 재현 및 운영

- Neon 스키마: `neon/migrations/0001_initial.sql`부터 `0004_rls.sql`까지.
- 공개 데이터 이전 스크립트: `apps/web/scripts/migrate-to-neon.mjs`. 원본 Supabase 프로젝트 삭제로 해당 프로젝트에서 재동기화할 수 없다.
- 신규 계정 및 RLS 확인: `apps/web/scripts/smoke-neon-auth.mjs`, `verify-neon-rls.mjs`.

---

## 마지막 작업 (2026-10-23)

이슈 #66 — GeekNews AI 봇(neo) 글 제외 수집 (develop 머지)

### 완료

- 코엑스 개발 행사 섹션 revert(PR #65) develop 머지
- 운영 DB 확인: GeekNews가 매일 정확히 10개만 저장됨. 원인은 #61(GeekNews 상한 30)이 develop에만 있고 운영(main)에 미반영
- GeekNews 실측(10/18~10/23): 하루 42~67개 중 AI 봇 `neo`(GN⁺, 해커뉴스 자동 번역) 31~43개, 사람 7~24개. 개발 무관 글 11개 중 10개가 `neo` 글
- `fetchRssAtom`에서 GeekNews `neo` 작성 항목 제외 → 상한(30) 적용 전 필터라 사람 글만 30개까지 수집
- 실제 피드 50개 대상 확인: 필터 후 사람 글 13개
- 키워드 분류기(`classifyCategories`)를 필터로 쓰는 방안은 정확도가 낮아 기각 (부분 문자열 매칭으로 무관 글 통과, 개발 글 탈락)
- `pnpm lint`, `pnpm test`, `pnpm typecheck`, `pnpm build` 통과

### 다음 할 일

- **develop → main 배포 PR (사용자 승인 필요).** 이게 돼야 운영에 GeekNews 상한 30과 `neo` 제외가 반영된다. main은 #54/#55 시점이라 #56~#66이 함께 나간다
- 배포 다음 날 DB에서 GeekNews 저장 수가 10개를 넘고 `neo` 글이 없는지 확인 (미확인)
- 이미 저장된 GeekNews `neo` 글 정리 여부 결정 (`docs/plans/open-questions.md`)
- `classifyCategories` 짧은 영문 키워드(`TS`, `JS`, `ML`, `FPS` 등) 부분 문자열 오매칭 버그 — 카드 주제 태그가 틀리게 붙음. 별도 이슈 필요
- 관리자 MVP(로드맵 6단계) 미착수

### 참고사항

- GeekNews `/new` 페이지는 `neo` 글과 Show GN 글을 보여주지 않는다. RSS(`/rss/news`)에는 모두 포함된다
- GeekNews 토픽 상세 페이지는 비브라우저 요청에 403을 반환한다. 목록 페이지(`/`, `/new`, `/plus`, `/show`)는 200
- 코엑스 migration 파일은 revert로 삭제됐고, 연결된 Supabase에 행사 섹션 소스는 없음을 확인
