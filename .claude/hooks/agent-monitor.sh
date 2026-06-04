#!/usr/bin/env bash
# Agent Monitor Hook — PreToolUse[Agent]
# 에이전트가 호출될 때 cmux 알림 + 로그 기록

set -u

LOG_DIR=".claude/logs"
PIPE="${LOG_DIR}/agents.pipe"
mkdir -p "$LOG_DIR"
if [ -e "$PIPE" ] && [ ! -p "$PIPE" ]; then rm -f "$PIPE"; fi
[ -p "$PIPE" ] || mkfifo "$PIPE"

INPUT=$(cat)

if [ -z "$INPUT" ]; then
  exit 0
fi

AGENT_INFO=$(python3 - "$INPUT" <<'PY'
import json, sys

try:
    payload = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)

tool_input = payload.get("tool_input") or {}
subagent_type = tool_input.get("subagent_type") or ""
description = tool_input.get("description") or ""

if subagent_type:
    desc_short = description[:80] if description else ""
    print(f"{subagent_type}|{desc_short}")
PY
)

if [ -z "$AGENT_INFO" ]; then
  exit 0
fi

AGENT_NAME="${AGENT_INFO%%|*}"
AGENT_DESC="${AGENT_INFO##*|}"

TIMESTAMP=$(date "+%H:%M:%S")

if [ -n "$AGENT_DESC" ]; then
  { echo "[${TIMESTAMP}] ▶ ${AGENT_NAME} — ${AGENT_DESC}" > "$PIPE"; } 2>/dev/null &
  cmux notify --title "▶ ${AGENT_NAME}" --body "${AGENT_DESC}" 2>/dev/null || true
else
  { echo "[${TIMESTAMP}] ▶ ${AGENT_NAME}" > "$PIPE"; } 2>/dev/null &
  cmux notify --title "▶ ${AGENT_NAME}" --body "실행 중..." 2>/dev/null || true
fi

exit 0
