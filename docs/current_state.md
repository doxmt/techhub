---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (2026-06-09)

### 완료
- 이슈 #30 생성: 홈 피드에서 아티클과 개발뉴스 섹션 분리
- 홈 `최신 뉴스` 탭은 개발뉴스 전용 준비중 상태로 변경하고, 기존 DB 아티클은 `아티클` 탭에서만 노출하도록 조정
- 출처와 주제 카테고리 필터는 `아티클` 탭에서만 표시/유지되도록 조정
- 다른 섹션으로 이동할 때 `source`, `categories` query가 제거되도록 조정

### 다음 할 일
- 개발뉴스 데이터를 실제로 수집/저장할 때 `content_items.section` 같은 명시 필드 추가 검토
- 개발뉴스 데이터가 준비되면 `news` 섹션 조회 로직 연결
- daily ingest 수정
  - `insert` → `upsert(..., { ignoreDuplicates: true })`
  - `ingestion_runs` insert 후 `.select("id")`
  - category insert / `last_ingested_at` update `await`
- 피드 UI 모바일 viewport 직접 확인

### 참고사항
- 현재 DB에 들어온 콘텐츠는 전부 아티클로 간주한다.
- `type`은 미디어 타입(`article`/`youtube`)으로 유지하고, 뉴스/아티클 같은 상위 섹션과 혼용하지 않는다.
- 네이버 D2/토스/카카오의 기본 RSS는 각각 20/20/10개만 내려오므로 백필은 API adapter를 사용해야 한다.
