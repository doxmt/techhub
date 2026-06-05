# AGENTS.md

@docs/architecture.md
@DESIGN.md
@docs/current_state.md

## Project Context

TechHub는 개발 관련 아티클과 유튜브 콘텐츠를 관리자가 선별해 등록하고, 사용자가 로그인 없이 최신순 피드에서 검색/필터링하는 공개 큐레이션 웹앱이다.
MVP는 Vercel + Supabase 기반이며 AI 기능, K8s/GitOps, 일반 사용자 제출, 북마크/좋아요는 제외한다.
로그인은 관리자 전용이며 GitHub OAuth와 이메일 allowlist를 사용한다.

## Repository Shape

- 모노레포는 Turborepo + pnpm workspace 기준이다.
- 웹 앱은 `apps/web`의 Next.js App Router 앱이다.
- 공유 패키지는 `packages/shared`이며 타입, 상수, 순수 유틸만 둔다.
- Supabase schema 변경은 `supabase/migrations`의 SQL migration으로 남긴다.
- 제품/아키텍처/디자인 결정은 `docs`와 `DESIGN.md`를 우선 확인한다.

## Non-Obvious Rules

- 터미널 멀티플렉서는 tmux가 아닌 **cmux**를 사용한다. tmux 명령어가 필요한 경우 cmux 동등 명령어로 대체한다.
- npm lockfile을 만들지 않는다. 패키지 설치와 스크립트 실행은 pnpm을 사용한다.
- 일반 사용자는 로그인하지 않는다. Auth 관련 UI는 관리자 전용이다.
- Supabase 쓰기 권한은 서버 체크와 RLS policy를 둘 다 통과해야 한다.
- Supabase client, Server Actions, UI 컴포넌트는 `apps/web` 안에 둔다.
- DB client나 React 컴포넌트를 `packages/shared`에 넣지 않는다.
- 공개 피드 검색/필터 상태는 URL query에 유지한다.
- 피드 로딩은 무한 스크롤을 사용한다.
- AI 요약/추천/태그 생성은 MVP에서 구현하지 않는다.

## Implementation Guidance

- Server Components를 기본으로 사용한다.
- 사용자 입력, 다이얼로그, 폼, 토스트, 무한 스크롤처럼 브라우저 상태가 필요한 부분만 Client Component로 만든다.
- Mutation 경계는 Server Actions를 우선 사용한다.
- Route Handler는 외부 webhook, cron, 명확한 HTTP API 경계가 필요할 때만 추가한다.
- Supabase 호출과 도메인 로직은 `apps/web/features/*/server`의 service layer에 모은다.
- 공개 UI는 첫 화면부터 개발자 피드여야 하며 마케팅 랜딩 페이지를 만들지 않는다.
- UI는 shadcn/ui와 lucide-react를 우선 사용하고, 모바일에서 긴 제목/태그가 넘치지 않게 확인한다.

## Agent Teams

Agent Teams가 활성화된 세션에서 사용자가 "팀 모드", "Agent Teams"라고 요청하거나 요청에 "conductor"를 포함하면 일반 Agent subagent 호출로 대체하지 않는다.

반드시 TeamCreate로 팀을 만든 뒤 conductor를 teammate로 spawn하고, 이후 필요한 작업자도 같은 팀의 teammate로 생성한다. conductor는 계획만 하며, team lead가 teammate 생성과 조율을 담당한다.

Agent Teams가 활성화되지 않은 세션에서는 conductor와 팀 관련 도구를 사용하지 않는다.

## Do Not

> 사용자가 반복 실수나 잘못된 가정을 지적하면, 다음 세션에서 반복하지 않도록 이 섹션에 짧게 추가한다.

- 사용자 변경이 있는 파일을 임의로 되돌리지 않는다.
- `README.md`는 현재 비어 있는 수정 상태다. 명시 요청 없이 되돌리거나 새 내용으로 덮어쓰지 않는다.
- Supabase Dashboard에서만 schema를 바꾸고 migration을 남기지 않는다.
- RLS 없이 서버 코드만 믿고 권한을 처리하지 않는다.
- RSS/API 자동 수집, AI 기능, 사용자 제출 기능을 MVP에 끼워 넣지 않는다.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm typecheck
```

필요하면 workspace 단위로 실행한다.

```bash
pnpm --filter @techhub/web test
pnpm --filter @techhub/shared test
```

## Definition of Done

PR 올리기 전 변경 범위에 맞게 아래를 확인한다.

- [ ] `pnpm lint` 통과
- [ ] `pnpm test` 통과
- [ ] `pnpm build` 통과
- [ ] `pnpm typecheck` 통과
- [ ] UI 변경 시 데스크톱과 모바일 viewport에서 직접 확인
- [ ] API/DB 변경 시 Supabase migration과 RLS policy 확인
- [ ] 관리자 권한 변경 시 익명/비관리자/관리자 케이스 확인
- [ ] 작업 상태를 바꾼 경우 `docs/current_state.md` 또는 `docs/work_log.md` 갱신

## Commit Message

Conventional Commits 형식을 따른다.

예시: `feat: 로그인 폼 유효성 검사 추가`
