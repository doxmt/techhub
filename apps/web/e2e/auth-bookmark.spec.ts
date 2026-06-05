/**
 * auth-bookmark.spec.ts
 *
 * TDD Red 단계: 인증 UI, 북마크 토글, 저장됨 탭이 아직 구현되지 않았으므로
 * 모든 테스트가 실패해야 한다.
 *
 * 커버 범위:
 * - 회원가입 다이얼로그 열기 → 폼 제출 → 성공 피드백
 * - 로그인 다이얼로그 → 폼 제출 → 세션 반영 (헤더 변화)
 * - 콘텐츠 카드 북마크 토글 → 로그인 요구 (비로그인)
 * - 로그인 후 북마크 토글 → 저장됨 탭에서 확인
 * - 저장됨 탭 비로그인 접근 → 로그인 유도 UI 표시
 */

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// 저장됨 탭 — 비로그인
// ---------------------------------------------------------------------------

test("저장됨 탭을 비로그인으로 방문하면 로그인 유도 UI를 표시한다", async ({
  page,
}) => {
  await page.goto("/?section=saved");

  // 리다이렉트 없이 현재 페이지에 로그인 유도 메시지가 나타나야 한다
  await expect(page).toHaveURL(/section=saved/);
  await expect(
    page.getByText(/로그인|로그인이 필요|sign in/i),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 회원가입
// ---------------------------------------------------------------------------

test("헤더에서 회원가입 다이얼로그를 열 수 있다", async ({ page }) => {
  await page.goto("/");

  // 헤더에 '회원가입' 또는 '로그인' 버튼이 있어야 한다
  const signUpButton = page.getByRole("button", { name: /회원가입|로그인/i }).first();
  await expect(signUpButton).toBeVisible();

  await signUpButton.click();

  // 다이얼로그 또는 모달이 열려야 한다
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("회원가입 폼에 유효하지 않은 이메일을 입력하면 오류 메시지를 표시한다", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: /회원가입/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // 회원가입 탭이 없으면 탭 전환
  const signUpTab = page.getByRole("tab", { name: /회원가입/i });
  if (await signUpTab.isVisible()) {
    await signUpTab.click();
  }

  await page.getByLabel(/이메일/i).fill("not-an-email");
  await page.getByLabel(/닉네임/i).fill("testuser");
  await page.getByLabel(/비밀번호/i).fill("password123");
  await page.getByRole("button", { name: /회원가입|제출|확인/i }).click();

  await expect(page.getByText(/이메일|유효하지/i)).toBeVisible();
});

test("닉네임이 20자를 초과하면 회원가입 오류 메시지를 표시한다", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: /회원가입/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const signUpTab = page.getByRole("tab", { name: /회원가입/i });
  if (await signUpTab.isVisible()) {
    await signUpTab.click();
  }

  await page.getByLabel(/이메일/i).fill("user@example.com");
  await page.getByLabel(/닉네임/i).fill("a".repeat(21));
  await page.getByLabel(/비밀번호/i).fill("password123");
  await page.getByRole("button", { name: /회원가입|제출|확인/i }).click();

  await expect(page.getByText(/닉네임|20자/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// 로그인
// ---------------------------------------------------------------------------

test("잘못된 비밀번호로 로그인하면 오류 메시지를 표시한다", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: /로그인/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const signInTab = page.getByRole("tab", { name: /로그인/i });
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  await page.getByLabel(/이메일/i).fill("user@example.com");
  await page.getByLabel(/비밀번호/i).fill("wrongpassword");
  await page.getByRole("button", { name: /로그인|제출|확인/i }).click();

  await expect(page.getByText(/비밀번호|로그인 실패|오류|error/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// 북마크 토글 — 비로그인
// ---------------------------------------------------------------------------

test("비로그인 상태에서 북마크 버튼을 클릭하면 로그인 다이얼로그가 열린다", async ({
  page,
}) => {
  await page.goto("/");

  // 첫 번째 콘텐츠 카드의 북마크 버튼
  const bookmarkButton = page
    .getByRole("button", { name: /북마크|저장/i })
    .first();
  await expect(bookmarkButton).toBeVisible();

  await bookmarkButton.click();

  // 로그인을 유도하는 다이얼로그 또는 토스트가 나타나야 한다
  const loginPrompt = page
    .getByRole("dialog")
    .or(page.getByText(/로그인이 필요|로그인 후/i));
  await expect(loginPrompt).toBeVisible();
});

// ---------------------------------------------------------------------------
// 북마크 → 저장됨 탭 (로그인 후 전체 플로우)
// ---------------------------------------------------------------------------

test("로그인 후 북마크한 콘텐츠가 저장됨 탭에 표시된다", async ({ page }) => {
  // NOTE: 이 테스트는 실제 Supabase 환경과 테스트 계정이 필요하다.
  // 현재 Red 단계이므로 UI 요소가 없어 실패한다.

  await page.goto("/");

  // 1. 헤더에서 로그인 다이얼로그 열기
  await page.getByRole("button", { name: /로그인/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const signInTab = page.getByRole("tab", { name: /로그인/i });
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  // 2. 테스트 계정으로 로그인 (E2E 전용 시드 계정)
  await page.getByLabel(/이메일/i).fill("e2e-test@techhub.dev");
  await page.getByLabel(/비밀번호/i).fill("e2e-test-password");
  await page.getByRole("button", { name: /로그인|제출|확인/i }).click();

  // 3. 로그인 성공 후 다이얼로그 닫힘, 헤더에 사용자 메뉴 표시
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
  await expect(
    page.getByRole("button", { name: /내 계정|프로필|아바타/i }),
  ).toBeVisible();

  // 4. 첫 번째 콘텐츠 카드의 제목 저장
  const firstCard = page.locator("a:has(article)").first();
  const firstTitle = await firstCard.locator("h2, h3").first().textContent();

  // 5. 북마크 토글
  const bookmarkButton = firstCard.getByRole("button", { name: /북마크|저장/i });
  await bookmarkButton.click();

  // 6. 토스트 성공 메시지 확인
  await expect(page.getByText(/저장됨|북마크 추가/i)).toBeVisible();

  // 7. 저장됨 탭으로 이동
  await page.getByRole("link", { name: /저장됨/i }).click();
  await expect(page).toHaveURL(/section=saved/);

  // 8. 북마크한 콘텐츠가 나타나야 한다
  await expect(page.getByText(firstTitle!)).toBeVisible();
});

// ---------------------------------------------------------------------------
// 로그아웃
// ---------------------------------------------------------------------------

test("로그아웃 후 저장됨 탭에서 로그인 유도 UI가 표시된다", async ({
  page,
}) => {
  // 로그아웃 후 section=saved 접근 시 리다이렉트 없이 유도 메시지 표시 확인
  // 현재 Red 단계: 로그아웃 버튼 미구현으로 실패 예상

  await page.goto("/");

  await page.getByRole("button", { name: /로그인/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const signInTab = page.getByRole("tab", { name: /로그인/i });
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  await page.getByLabel(/이메일/i).fill("e2e-test@techhub.dev");
  await page.getByLabel(/비밀번호/i).fill("e2e-test-password");
  await page.getByRole("button", { name: /로그인|제출|확인/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });

  // 사용자 메뉴에서 로그아웃
  await page.getByRole("button", { name: /내 계정|프로필|아바타/i }).click();
  await page.getByRole("menuitem", { name: /로그아웃/i }).click();

  // 로그아웃 후 저장됨 탭 접근
  await page.goto("/?section=saved");
  await expect(page.getByText(/로그인이 필요|로그인/i)).toBeVisible();
});
