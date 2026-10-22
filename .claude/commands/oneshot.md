---
description: 작업 하나를 계획부터 구현, 기록, PR, develop 병합까지 한 번에 진행한다. /oneshot으로 명시 호출할 때만 사용한다.
argument-hint: "[작업 설명]"
disable-model-invocation: true
---

Run one task from plan to merge in a single run: plan → start → wrap → submit → finish. Each stage follows `.claude/commands/<stage>.md`; the overrides below take precedence. `executor` is the only agent this command calls.

Task: $ARGUMENTS

1. Preconditions: run `git status --porcelain` and `git branch --show-current`. Stop if the working tree is not clean or the branch is not `develop`.
2. Plan (`plan`): take the task from the request, or the next planned task in `docs/current_state.md`. If a plan file for it already exists in `docs/plans/`, use it unchanged. Otherwise write it without interviewing: verify facts yourself, choose the most conservative, easily reversible option at each decision point, and record each choice as an assumption in the plan and in `docs/plans/open-questions.md`. Do not call `planner`, `analyst`, or `critic`.
3. Authorization: invoking `/oneshot` authorizes the planned issue, branch, push, pull request to `develop`, squash merge, and feature-branch deletion for this one task. Show the plan path, steps, assumptions, any hard-to-reverse change (data model, public API, auth, payments, migrations), and the intended remote actions, then continue without asking for confirmation. If the planned task includes auth, payments, destructive data changes, or an irreversible external action beyond this workflow, stop and ask for a separate scope decision before implementation.
4. Start (`start`): create the issue and branch, hand implementation to `executor` (it writes the failing tests first, then the implementation), and verify with `pnpm lint`, `pnpm test`, `pnpm typecheck`, and `pnpm build`. Skip its `git status` and confirmation checks and its `test-engineer`/`explore`/`architect` calls; the uncommitted plan file is expected and moves to the new branch. If `executor` reports `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`, investigate the cause, provide missing context to the same agent when useful, and complete fixable code or test work on the current branch. Re-run the affected checks and acceptance criteria. Do not end the run merely because the agent reported a partial result or because two fix attempts were insufficient.
5. Wrap (`wrap`): run it on the feature branch before committing, so the document updates ship in the same pull request. Write `docs/current_state.md` as it should read after the merge. Record unavailable manual or device checks (for example desktop/mobile viewport checks) and remaining follow-up work in `current_state.md`, the pull-request checklist, and the final report; never describe an unrun check as passed. Do not ask about a new `CLAUDE.md` rule; put the proposal in the final report.
6. Submit (`submit`): commit everything this run produced, including the plan file and the `docs/` updates, then push and create the pull request. Skip its confirmation checks.
7. Finish (`finish`): wait for checks (`gh pr checks --watch`), squash merge, delete the branch, and update `develop`. Skip its confirmation check. If a CI check fails or the pull request conflicts, investigate, fix on the same branch, push, and recheck before merging.

Continue automatically when implementation or tests are incomplete: fix them, verify again, and finish the remaining workflow. Unavailable manual checks may remain as clearly labeled follow-up work if automated checks pass and no known functional defect remains. Do not merge while a required automated check fails, a known functional defect remains, or the pull request conflicts. Stop only when the lead cannot resolve such a blocker after investigating it, or when a separate scope decision or authorization is required. On a stop, report the stage reached, what already exists remotely (issue, branch, pull request), the specific blocker and attempted fixes, and which command to run next by hand.

Never merge into `main`.

Write the plan, issue, pull request, `docs/` entries, and reports in Korean.
