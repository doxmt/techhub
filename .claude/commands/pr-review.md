---
description: PR 올리기 전 브랜치 전체 코드 리뷰를 실행하고 한국어 결과를 docs/pr-review.md에 저장
argument-hint: ""
allowed-tools: Bash(find:*), Bash(node:*), Bash(mkdir:*), Write
---

Codex로 현재 브랜치의 전체 커밋을 리뷰하고 결과를 한국어로 `docs/pr-review.md`에 저장하라.

1. companion script 경로 확인:

```bash
find ~/.claude/plugins/cache/openai-codex -name "codex-companion.mjs" 2>/dev/null | tail -1
```

경로가 없으면 "Codex 플러그인이 설치되지 않았습니다. docs/setup.md를 참고하세요." 라고 안내하고 중단하라.

2. 브랜치 전체 리뷰 실행 (포그라운드):

```bash
node "$(find ~/.claude/plugins/cache/openai-codex -name codex-companion.mjs 2>/dev/null | tail -1)" review --scope branch --wait
```

3. 출력 결과를 한국어로 번역한 뒤 `docs/pr-review.md`에 저장하라.
