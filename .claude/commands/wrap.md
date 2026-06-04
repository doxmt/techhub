---
description: 이번 작업 세션을 마무리하고 문서를 업데이트하라.
argument-hint: ""
allowed-tools: Bash(cat:*)
---

이번 세션을 마무리합니다. 아래 순서대로 진행하세요.

**중요: 세션에서 한 작업은 대화 내용에서 바로 파악하세요. 파악을 위해 파일을 읽지 마세요.**

## 1. work_log.md에 이번 세션 append

Bash heredoc으로 바로 추가 (읽기 없이):

```bash
PROJ=$(git rev-parse --show-toplevel)
cat >> "$PROJ/docs/work_log.md" << 'EOF'

## YYYY-MM-DD
- (완료한 작업 한 줄씩)
EOF
```

## 2. current_state.md 덮어쓰기

Bash heredoc으로 바로 덮어쓰기 (읽기 없이):

```bash
PROJ=$(git rev-parse --show-toplevel)
cat > "$PROJ/docs/current_state.md" << 'EOF'
---
name: 현재 작업 상태
description: 가장 최근 세션의 작업 상태와 다음 할 일
type: project
---

## 마지막 작업 (YYYY-MM-DD)

### 완료
- (완료된 작업 간단 요약)

### 다음 할 일
- (다음에 이어서 할 작업)

### 참고사항
- (다음 세션에서 알아야 할 것. 없으면 생략)
EOF
```

완료되면 "wrap 완료 ✓" 라고 출력하세요.
