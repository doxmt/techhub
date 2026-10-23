---
description: 에이전트 로그 pane을 오른쪽에 띄운다.
argument-hint: ""
allowed-tools: Bash(mkdir:*), Bash(touch:*), Bash(grep:*), Bash(head:*), Bash(cmux:*)
---

에이전트 로그 pane을 엽니다.

```bash
mkdir -p .claude/logs
LOG_PATH="$(pwd)/.claude/logs/agents.log"
touch "$LOG_PATH"

# env var 없을 경우 cmux identify로 폴백
if [ -z "${CMUX_SURFACE_ID:-}" ]; then
  CMUX_SURFACE_ID=$(cmux identify 2>/dev/null | grep -o '"surface_ref" : "surface:[^"]*"' | head -1 | grep -o 'surface:[^"]*')
fi

if [ -z "${CMUX_SURFACE_ID:-}" ]; then
  echo "cmux 세션 안에서 실행해주세요."
  exit 0
fi

NEW_SURFACE=$(cmux new-split right --focus false 2>/dev/null | grep -o 'surface:[0-9]*' | head -1)

if [ -n "$NEW_SURFACE" ]; then
  cmux send --surface "$NEW_SURFACE" "tail -f $LOG_PATH"$'\n'
else
  echo "pane 생성 실패 — cmux 세션 안에서 실행해주세요."
  exit 0
fi
```

완료되면 "모니터 pane 열림 ✓" 라고 출력하세요.
cmux 세션 밖에서 실행 중이라면 "cmux 세션 안에서 실행해주세요." 라고 출력하세요.
