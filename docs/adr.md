# 기술 결정 기록 (Architecture Decision Records)

## ADR-001: Vercel + Supabase를 MVP 인프라로 사용한다

**날짜:** 2026-06-04

**결정:** TechHub MVP는 Vercel과 Supabase를 사용한다.

**이유:** 초기 목표는 K8s 운영 역량을 보여주는 것보다 개발 콘텐츠 큐레이션 제품을 빠르게 검증하는 것이다. Vercel은 Next.js 배포와 Preview 환경이 단순하고, Supabase는 Postgres, Auth, RLS를 한 번에 제공한다. 작은 공개 MVP에서는 운영 비용과 인프라 설정을 크게 줄일 수 있다.

**대안:** AWS EKS, GKE, Civo/DigitalOcean K8s, VPS+k3s.

**트레이드오프:** K8s/GitOps 경험은 MVP에 포함되지 않는다. 대신 코드 구조를 server action/service layer 중심으로 유지해 추후 컨테이너/K8s 이전 가능성을 남긴다.

---

## ADR-002: Next.js App Router를 웹 프레임워크로 사용한다

**날짜:** 2026-06-04

**결정:** 웹 앱은 Next.js App Router로 구현한다.

**이유:** 공개 피드, 상세 페이지, 관리자 대시보드, 서버 메타데이터 수집을 하나의 앱에서 처리할 수 있다. Vercel 배포와 궁합이 좋고 Server Components, Server Actions, metadata API를 활용하기 좋다.

**대안:** React + Vite, Remix.

**트레이드오프:** Next.js의 서버/클라이언트 경계를 명확히 지키지 않으면 코드가 복잡해질 수 있다. 기본은 Server Components로 두고, 브라우저 상태가 필요한 부분만 Client Component로 제한한다.

---

## ADR-003: Turborepo + pnpm workspace를 사용한다

**날짜:** 2026-06-04

**결정:** 저장소는 Turborepo와 pnpm workspace 기반 모노레포로 구성한다.

**이유:** MVP는 단일 웹앱이지만, 추후 shared package, 문서, 인프라 산출물을 분리하기 좋다. Turborepo는 Next.js/Vercel 생태계와 잘 맞고 task pipeline과 캐시 설정이 단순하다. pnpm은 빠르고 lockfile이 안정적이다.

**대안:** 단일 Next 앱, pnpm workspace만 사용, Nx.

**트레이드오프:** 단일 앱보다 초기 설정이 조금 늘어난다. 초기 패키지는 `apps/web`과 `packages/shared`만 두어 복잡도를 제한한다.

---

## ADR-004: Supabase SDK + SQL migration을 사용한다

**날짜:** 2026-06-04

**결정:** DB 접근은 Supabase SDK를 기본으로 사용하고, schema/RLS/migration은 Supabase CLI SQL로 관리한다.

**이유:** Supabase Auth와 RLS를 자연스럽게 사용하려면 Supabase 방식의 클라이언트와 SQL policy 관리가 가장 명확하다. SQL migration은 RLS policy, FTS index, DB 함수 같은 Postgres 기능을 그대로 버전 관리할 수 있다.

**대안:** Drizzle ORM, Prisma, Dashboard 수동 관리.

**트레이드오프:** ORM 수준의 추상화는 줄어든다. 대신 Supabase CLI typegen으로 TypeScript 타입 안정성을 보완한다.

---

## ADR-005: Postgres Full Text Search로 MVP 검색을 구현한다

**날짜:** 2026-06-04

**결정:** MVP 검색은 Supabase Postgres의 Full Text Search를 사용한다.

**이유:** 별도 검색 서비스를 운영하지 않고도 제목, 설명, 태그 검색을 구현할 수 있다. 초기 콘텐츠 규모에서는 비용과 운영 복잡도를 줄이는 것이 검색 품질보다 중요하다.

**대안:** 단순 `ilike`, Meilisearch, Algolia.

**트레이드오프:** 전문 검색 서비스보다 랭킹, typo tolerance, 분석 기능이 약하다. 검색 품질이 제품 병목이 되면 Meilisearch 또는 Algolia 도입을 재검토한다.

---

## ADR-006: Tailwind CSS + shadcn/ui를 UI 기반으로 사용한다

**날짜:** 2026-06-04

**결정:** UI는 Tailwind CSS와 shadcn/ui를 사용한다.

**이유:** TechHub는 Linear형 밀도 높은 개발자 도구 UI가 필요하다. shadcn/ui는 소유 가능한 컴포넌트 코드를 제공하고, Tailwind와 조합해 빠르게 조정할 수 있다.

**대안:** Tailwind만 사용, MUI.

**트레이드오프:** shadcn/ui 컴포넌트는 프로젝트 코드로 들어오기 때문에 관리 책임이 생긴다. 대신 디자인 소유권과 커스터마이징 자유도가 높다.

---

## ADR-007: AI와 K8s/GitOps는 MVP에서 제외한다

**날짜:** 2026-06-04

**결정:** AI 요약/추천/태그 생성과 K8s/GitOps 배포는 MVP 범위에서 제외한다.

**이유:** 초기 검증 대상은 콘텐츠 큐레이션 UX와 관리자 등록 흐름이다. AI와 K8s는 비용, 실패 처리, 운영 복잡도를 크게 늘리므로 첫 출시 이후로 미룬다.

**대안:** 간단 AI 태그 추천 포함, 처음부터 Civo/EKS 기반 GitOps 구성.

**트레이드오프:** 기술적으로 화려한 기능은 줄어든다. 대신 제품 검증 속도와 운영 안정성을 우선한다.

---

## ADR-004: 카드 UI에서 좋아요(추천) 버튼 제거, 모달에서만 접근

**날짜:** 2026-06-06
결정: 콘텐츠 카드에는 북마크 버튼만 두고, 추천(좋아요)은 미리보기 모달에서만 접근 가능하게 한다.
이유: 리스트뷰에서 하트 버튼이 불필요하게 복잡하고 공간을 차지한다는 사용자 피드백.
대안: 리스트뷰에서도 추천 버튼 유지.
트레이드오프: 추천 접근성이 낮아지지만 카드 UI가 단순해짐. 모달을 통해 여전히 추천 가능.

---

## ADR-005: 마이페이지를 별도 앱이 아닌 동일 앱 내 /profile 경로로 구현

**날짜:** 2026-06-06
결정: 마이페이지를 별도 monorepo 앱으로 분리하지 않고 apps/web/app/profile/로 구현한다.
이유: Supabase client, Server Actions, auth 미들웨어를 공유할 수 있고, 배포·환경변수 관리가 단순함. 관리자가 혼자라 팀 분리 불필요. RLS + 서버 체크로 충분히 격리됨.
대안: apps/admin 별도 앱으로 분리.
트레이드오프: 코드 경계가 느슨해질 수 있으나 MVP 규모에서는 오버엔지니어링.

---

## ADR-006: Admin 버튼 노출 기준을 profiles.role로 관리

**날짜:** 2026-06-06
결정: 헤더의 Admin 버튼을 profiles.role='admin'인 유저에게만 표시한다.
이유: 일반 유저에게 Admin 버튼이 노출되는 UX 문제. role 컬럼이 이미 profiles 테이블에 있으므로 추가 인프라 불필요.
대안: URL 숨김(보안에 의존하지 않음), 별도 admin_users 테이블.
트레이드오프: 없음. 이미 있는 role 필드를 활용하는 자연스러운 방식.

---

## ADR-006: 가중치 점수 기반 다중 카테고리 분류

**날짜:** 2026-06-08
결정: RSS 태그(10점) > 제목(3점) > 본문(1점) 가중치 점수로 카테고리 분류, 아티클당 최대 3개
이유: 단일 카테고리 강제 할당은 FE+Architecture처럼 복합 주제 아티클을 손실 없이 표현하지 못함. AI 없이 키워드 기반으로 비용 없이 구현 가능
대안: AI 임베딩 분류(비용/복잡도), 단일 카테고리 강제(표현력 손실), 관리자 수동 분류(운영 부담)
트레이드오프: 키워드 오탐 가능성 있으나 수집 규모에서 허용 가능. RSS category 태그가 없는 소스가 많아 제목/본문 매칭이 주력

---

## ADR-007: 피드 필터 URL 파라미터 설계

**날짜:** 2026-06-08
결정: 출처는 `?source=NHN+Cloud` 단일 선택, 카테고리는 `?categories=fe,be` 콤마구분 최대 3개
이유: 출처는 한 번에 하나의 블로그만 보는 UX가 자연스럽고, 카테고리는 복합 주제 탐색을 위해 다중 선택 허용. 콤마구분은 반복 파라미터보다 URL이 짧고 파싱이 단순
대안: 카테고리 반복 파라미터(`?category=fe&category=be`), 카테고리 단일 선택
트레이드오프: 콤마구분은 값 자체에 콤마가 포함될 수 없어야 하나 slug는 영문+하이픈만 사용하므로 안전

---

## ADR-008: 콘텐츠 상세 페이지를 만들지 않고 원문으로 직행

**날짜:** 2026-07-29
결정: 앱 내부 상세 페이지(`app/[slug-id]`)를 구현하지 않고, 카드와 미리보기의 이동 버튼이 원문(`content_items.url`)을 새 탭으로 연다. SEO/OG는 홈에만 설정한다.
이유: 수집한 콘텐츠는 원문이 이미 완결된 읽을거리라 중간 페이지가 사용자에게 추가 가치를 주지 않는다. 상세 페이지를 유지하면 원문 본문 복제나 요약이 필요한데 MVP 범위 밖이다.
대안: `slug + id` 라우트로 메타정보와 원문 이동 버튼을 제공하는 상세 페이지 (초기 로드맵 3단계 계획).
트레이드오프: 콘텐츠별 OG/SEO 랜딩을 포기한다. 대신 `getContentBySlugId`와 `lib/slug.ts`가 dead code가 되어 제거했다. `content_items.slug` 컬럼은 위비티 공모전 중복 제거에 계속 쓰이므로 유지한다.

---

## ADR-009: 공모전의 안정적 식별자는 url이 아니라 slug

**날짜:** 2026-07-29
결정: 공모전은 slug(`wevity-{ix}`)를 안정적 식별자로 다룬다. insert 전에 기존 slug를 조회해 신규만 insert하고, 이미 있는 행은 `url`/`thumbnail`/`deadline`을 update한다. 배치 insert가 실패하면 행 단위로 재시도한다.
이유: `content_items.slug`에 UNIQUE 제약이 있는데 upsert의 `onConflict`는 컬럼을 하나만 지정할 수 있다. slug 충돌은 `ON CONFLICT (url)`이 잡지 못하고 INSERT 문 전체를 abort시켜 해당 소스의 신규 공모전이 통째로 유실됐다. 위비티는 등록 후 홈페이지 링크가 나중에 붙고 두 소스(cidx=20/21)가 같은 ix를 공유해 `url` 충돌이 상시 발생한다.
대안: (1) slug UNIQUE 제약 제거 — 다른 수집 경로의 중복 방어가 사라진다. (2) 위비티 상세 URL을 항상 `url`로 쓰고 홈페이지는 별도 컬럼 — 스키마 변경이 필요하고 "원문 홈페이지를 url로 쓴다"는 기존 설계와 어긋난다.
트레이드오프: 소스당 slug 조회 쿼리가 1회 늘어난다. 대신 마감일 연장과 홈페이지 링크 추가가 반영되고, 한 행의 제약 위반이 소스 전체를 죽이지 않는다.

---

## ADR-010: 북마크 섹션 탭을 클라이언트 상태가 아닌 URL query로 관리

**날짜:** 2026-07-29
결정: 저장한 콘텐츠의 섹션 탭(전체/최신뉴스/아티클/공모전)을 `useState`가 아닌 URL query(`?section=saved&saved=<섹션>`)로 관리하고, 섹션 필터를 `content_items!inner` join으로 DB에서 처리한다. 탭 배지 개수는 별도 집계 쿼리(`getSavedCounts`)로 구한다.
이유: 클라이언트 필터링을 하려면 전체 북마크를 한 번에 받아야 해서 `limit: 200` 하드캡이 필요했고, 201건째부터 조용히 잘렸다. "공개 피드 검색/필터 상태는 URL query에 유지한다", "피드 로딩은 무한 스크롤을 사용한다"는 프로젝트 규칙에도 어긋났다.
대안: 캡을 올리거나 클라이언트에서 커서 페이지네이션 후 필터링 — 탭별 개수가 로드된 만큼만 정확해진다.
트레이드오프: 탭 전환이 클라이언트 상태 변경에서 서버 왕복으로 바뀌어 즉각성이 줄고, 배지 집계 쿼리 4회가 추가된다. 대신 개수 제한이 사라지고 탭 상태가 URL에 남아 공유·새로고침에 견딘다. 상태가 필요 없어져 `BookmarkTabs`는 server component가 됐다.
