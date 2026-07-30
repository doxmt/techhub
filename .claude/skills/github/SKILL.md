---
name: github
description: GitHub workflow rules - 이슈/PR 생성, 브랜치 네이밍, 커밋 컨벤션
disable-model-invocation: true
---

# GitHub 워크플로우

## 작업 흐름

1. `git checkout develop && git pull origin develop` — develop으로 이동 후 최신화
2. 이슈 생성 → 번호 확인
3. 이슈 번호로 브랜치 생성 (`develop` 기점)
4. 작업 & 커밋
5. PR 생성 (`develop` 기준)
6. code-reviewer 호출 → 리뷰 결과 확인
7. 수정 후 커밋 & 푸시
8. Squash merge → 브랜치 삭제 → `git pull origin develop`

## 이슈 생성

작업 시작 전 이슈를 생성한다. 본문은 `.claude/skills/github/templates/`의 템플릿을 참조:

- 기능 추가 → `feature.md`
- 버그 수정 → `bug.md`
- 테스트 추가 → `test.md`

```bash
gh issue create \
  --title "feat: 기능명" \
  --body "..."
```

제목 형식:
- 기능 추가: `feat: 기능명`
- 버그 수정: `fix: 버그명`
- 스타일: `style: 내용`
- 리팩토링: `refactor: 내용`

## 브랜치 생성

이슈 번호를 브랜치명에 포함:

```bash
git checkout -b feat/{이슈번호}-{기능명}
# 예: feat/1-홈화면
# 예: fix/2-로그인오류
```

## 커밋 메시지

```
feat: 기능 추가
fix: 버그 수정
style: 스타일 변경
refactor: 리팩토링
chore: 기타
```

## PR 생성

작업 완료 후 PR 생성, 반드시 `develop` 브랜치로. 본문은 `.claude/skills/github/templates/pr.md` 참조:

```bash
gh pr create \
  --title "feat: 기능명" \
  --body "..." \
  --base develop
```

본문에 `Closes #{이슈번호}` 필수 — PR 머지 시 이슈 자동 닫힘

## 머지

- Squash merge 사용 (단 `develop → main` 배포 PR은 merge 커밋 사용 — main은 develop의 미러다)
- 머지 후 브랜치 삭제
- 머지 후 `git pull origin develop` — 최신화

### 머지 전 CI 확인 (필수)

무료플랜 + private 저장소라 branch protection을 쓸 수 없다. CI 통과 확인은 전적으로 수동이다.

**체크가 안 보인다고 "체크 없음"으로 단정하지 않는다.** PR 생성 후 GitHub Actions가
실행을 큐잉하기까지 수 분이 걸린다. 실제로 2026-07-30 PR #48에서 러너 생성이 PR 생성보다
4분 30초 늦었고, 그 사이 "체크 없음"으로 판단해 머지한 사고가 있었다.

`gh pr checks <N>`은 **head 브랜치 기준**으로 조회하므로, head가 `develop`인 배포 PR에서는
`no checks reported on the 'develop' branch`라는 오해하기 쉬운 메시지를 낸다.
PR의 head commit 기준으로 직접 확인하는 편이 확실하다:

```bash
SHA=$(gh api repos/doxmt/techhub/pulls/<N> --jq '.head.sha')
gh api repos/doxmt/techhub/commits/$SHA/check-runs \
  --jq '.check_runs[] | "\(.name): \(.status)/\(.conclusion)"'
```

체크가 하나도 없으면 아직 큐잉 중일 수 있으니 기다린다. 머지하지 않는다.
`mergeable_state: clean`은 충돌 없음이지 CI 통과가 아니다.
