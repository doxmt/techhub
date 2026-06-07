---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-06-06)

### 완료
- 일반 사용자 인증 (회원가입/로그인/로그아웃), 북마크/좋아요, 마이페이지 전체 구현
- PR #15 생성 (feat/14-user-auth-bookmarks → develop, closes #14)
- 이슈 #14: "feat: 일반 사용자 인증, 북마크/좋아요, 마이페이지" (OPEN, PR 대기 중)

### 다음 할 일
- PR #15 develop 머지 완료
- RSS/API 소스 관리 및 자동 수집 (Vercel Cron, ingestion_runs)
- 관리자 콘텐츠 관리 UI (TanStack Table 기반 콘텐츠 목록, 게시/비공개/삭제) ← 맨 마지막

### 참고사항
- Supabase 원격 email confirmation 비활성화 완료 (supabase config push)
- profiles.role='admin'인 유저만 Admin 버튼 노출 및 /admin 접근 가능
- /profile 마이페이지: 계정 탈퇴는 SUPABASE_SERVICE_ROLE_KEY 필요 (lib/supabase/admin.ts)
- 조회수/추천수 카운트는 하드코딩 0, 나중에 구현 예정
