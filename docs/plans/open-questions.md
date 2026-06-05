# Open Questions

계획과 분석 전반에서 미해결로 남은 질문/결정을 한 곳에서 추적한다.

## supabase-feed-mvp - 2026-06-04

- [ ] E2E CI 게이트(Playwright step) 추가 여부 — 현재 어느 workflow에도 E2E가 없어 실데이터 전환 시 selector 깨짐이 자동 차단되지 않는다. 게이트가 없으면 회귀 방지 장치가 사람 검토에만 의존한다.
- [ ] CI Supabase migration 자동화(`SUPABASE_ACCESS_TOKEN` 등 secret) 추가 시점 — 지금은 로컬 `db push`에 의존한다. 자동화 시점/방식을 정하지 않으면 환경 간 schema drift 위험이 있다.
- [ ] FTS 고도화(pg_trgm, 한국어 형태소) 시점 — 현재 `simple` config는 ko 형태소 분석이 없어 검색 품질 한계가 있다. 콘텐츠 규모가 커질 때 도입 기준을 정해야 한다.
- [ ] slug 수정 후 redirect 유지 방식 — slug 변경 시 옛 URL을 어떻게 canonical로 유지할지(이력 테이블 vs id 단독 조회)에 따라 SEO/링크 안정성이 갈린다.
- [ ] 다크 테마 토글 UI 디자인 개선 — MVP는 헤더 최소 토글만 구현한다. DESIGN.md Linear 톤에 맞춘 토글/시스템 연동 UX 개선 범위를 후속에서 정한다.
