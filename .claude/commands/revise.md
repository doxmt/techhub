---
description: 코드 리뷰 결과를 코드에 반영 (explore/architect/test-engineer → executor)
argument-hint: ""
allowed-tools: Read, Agent
---

1. `docs/code-review.md` 읽기
2. 리뷰 지적 사항을 반영하기 전에 코드베이스에서 직접 확인해야 하는 사실이 있으면 explore 에이전트를 호출하라.
   - 지적된 파일, 관련 호출자, 유사 패턴, 테스트 위치를 확인하게 하라.
3. 리뷰 제안이 프로젝트 아키텍처(`docs/architecture.md`)와 충돌할 가능성이 있거나 설계 판단이 필요하면 architect 에이전트를 호출하라.
4. 리뷰 지적이 테스트 부족, 버그 수정, 동작 변경, 회귀 위험, 검증 전략 공백과 관련 있으면 test-engineer 에이전트를 호출하라.
   - code-review.md 내용과, 호출했다면 explore/architect 결과를 전달하라.
   - 수정 전에 실패 테스트, 회귀 테스트, 또는 기존 테스트 수정이 필요한지 판단하게 하라.
   - 필요한 경우 TDD 원칙에 따라 실패 테스트를 먼저 작성하게 하라.
   - 현재 test-engineer는 subagent로 실행 중이므로 다른 Agent를 호출하지 않게 하라.
5. executor 에이전트를 호출하여 수정을 시작하라. code-review.md 내용과, 호출했다면 explore/architect/test-engineer 결과를 함께 전달하라.
   - 프로젝트 아키텍처(`docs/architecture.md`)와 규칙(`CLAUDE.md`)에 위배되는 제안은 무시하도록 안내하라.
   - 수정은 문제점 → 설계 의문 → 개선 제안 순서로 진행하라.
   - 현재 executor는 subagent로 실행 중이므로 다른 Agent를 호출하지 않게 하라.
   - explore/architect/test-engineer 조사는 이 command가 이미 수행했거나 필요한 범위에서 생략했다고 간주하게 하라.
   - test-engineer가 실패 테스트를 작성했다면, 그 테스트를 통과시키는 방향으로 수정하게 하라.
   - 커밋은 하지 않는다.
