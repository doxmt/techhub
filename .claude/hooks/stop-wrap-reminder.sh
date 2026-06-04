#!/bin/bash
# 세션 종료 전 /wrap 누락 감지 — 스테이징된 변경사항이 있으면 알림

STAGED=$(git diff --cached --name-only 2>/dev/null)
UNSTAGED=$(git diff --name-only 2>/dev/null)

if [ -n "$STAGED" ] || [ -n "$UNSTAGED" ]; then
  cmux notify --title "harness" --body "/wrap을 실행하지 않았습니다. 변경사항이 남아 있습니다." 2>/dev/null || true
fi
