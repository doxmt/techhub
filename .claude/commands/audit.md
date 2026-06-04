---
description: 전체 코드베이스 보안 감사 + 코드 단순화 (security-reviewer 교차검증 → code-simplifier)
argument-hint: ""
allowed-tools: Agent
---

전체 코드베이스를 대상으로 아래 순서대로 실행하라.

1. security-reviewer 에이전트를 호출하여 보안 취약점을 감사하라.
   - 현재 security-reviewer는 subagent로 실행 중이므로 다른 Agent를 호출하지 않게 하라.
   - 교차 검증이 필요하면 main command가 별도 security-reviewer 호출로 수행한다고 안내하라.
2. 1차 감사 결과에 치명적/높음 심각도 이슈가 있거나 확신이 낮은 보안 판단이 있으면, 별도 security-reviewer 에이전트를 호출하여 교차 검증하라.
   - 1차 결과를 전달하고, 누락된 취약점, 과장된 판단, 재현 가능성, 우선순위를 검증하게 하라.
3. security-reviewer 결과를 사용자에게 보고하라.
4. code-simplifier 에이전트를 호출하여 과도한 복잡도와 불필요한 추상화를 제거하라. 보안 감사 결과가 있으면 함께 전달하라. 커밋은 하지 않는다.
