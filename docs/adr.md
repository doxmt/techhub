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
