#!/usr/bin/env bash
set -u
LOG_DIR=".claude/logs"
PIPE="${LOG_DIR}/agents.pipe"
mkdir -p "$LOG_DIR"
if [ -e "$PIPE" ] && [ ! -p "$PIPE" ]; then rm -f "$PIPE"; fi
[ -p "$PIPE" ] || mkfifo "$PIPE"
INPUT=$(cat)
[ -z "$INPUT" ] && exit 0
AGENT_INFO=$(python3 - "$INPUT" <<'PY'
import json, sys
try:
    payload = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)
tool_input = payload.get("tool_input") or {}
subagent_type = tool_input.get("subagent_type") or ""
tool_result = payload.get("tool_result") or ""
if isinstance(tool_result, list):
    parts = [b.get("text", "") for b in tool_result if isinstance(b, dict)]
    tool_result = " ".join(parts)
summary = tool_result.strip()[:120].replace("\n", " ")
if subagent_type:
    print(f"{subagent_type}|{summary}")
PY
)
[ -z "$AGENT_INFO" ] && exit 0
AGENT_NAME="${AGENT_INFO%%|*}"
AGENT_SUMMARY="${AGENT_INFO##*|}"
TIMESTAMP=$(date "+%H:%M:%S")
if [ -n "$AGENT_SUMMARY" ]; then
  { echo "[${TIMESTAMP}] ✅ ${AGENT_NAME} — ${AGENT_SUMMARY}" > "$PIPE"; } 2>/dev/null &
  cmux notify --title "✅ ${AGENT_NAME} 완료" --body "${AGENT_SUMMARY}" 2>/dev/null || true
else
  { echo "[${TIMESTAMP}] ✅ ${AGENT_NAME} 완료" > "$PIPE"; } 2>/dev/null &
  cmux notify --title "✅ ${AGENT_NAME} 완료" --body "" 2>/dev/null || true
fi
exit 0
