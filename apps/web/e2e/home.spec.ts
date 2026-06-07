import { expect, test } from "@playwright/test";

test("renders the public TechHub feed", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "최신 개발 뉴스" })).toBeVisible();
  await expect(page.getByText("TanStack Query v5 마이그레이션 가이드")).toBeVisible();
});

test("switches public hub sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "최신 뉴스" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "아티클" }).click();
  await expect(page).toHaveURL(/section=article/);
  await expect(page.getByRole("link", { name: "아티클" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "공모전" }).click();
  await expect(page).toHaveURL(/section=contest/);
  await expect(page.getByRole("heading", { name: "공모전 데이터 준비중" })).toBeVisible();
  await expect(page.getByRole("button", { name: "더 보기" })).toBeHidden();
});

test("loads a second feed page", async ({ page }) => {
  await page.goto("/");

  const cards = page.locator("a:has(article)");
  await expect(cards).toHaveCount(20);

  await page.getByRole("button", { name: "더 보기" }).click();

  await expect(page.getByText("React Server Components 완벽 가이드")).toBeVisible();
  await expect(cards).toHaveCount(21);
  await expect(page.getByRole("button", { name: "더 보기" })).toBeHidden();
});

test("keeps filters and search in the URL", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Frontend" }).click();
  await expect(page).toHaveURL(/category=fe/);

  await page.getByRole("link", { name: "아티클" }).click();
  await expect(page).toHaveURL(/section=article/);

  await page.getByRole("button", { name: "KO" }).click();
  await expect(page).toHaveURL(/lang=ko/);

  await page.getByPlaceholder("검색어 입력").fill("React");
  await page.getByPlaceholder("검색어 입력").press("Enter");

  await expect(page).toHaveURL(/category=fe/);
  await expect(page).toHaveURL(/section=article/);
  await expect(page).toHaveURL(/lang=ko/);
  await expect(page).toHaveURL(/q=React/);
});

test("handles content detail canonical redirect and 404", async ({ page }) => {
  await page.goto("/");

  const href = await page
    .locator("a", { hasText: "TanStack Query v5 마이그레이션 가이드" })
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();

  const id = href!.split("-").at(-1);
  const response = await page.goto(`/wrong-slug-${id}`);
  const redirectRequest = response?.request().redirectedFrom();
  const redirectResponse = await redirectRequest?.response();

  expect(redirectResponse?.status()).toBe(308);
  await expect(page).toHaveURL(new RegExp(`${href!.replace("/", "\\/")}$`));

  const notFoundResponse = await page.goto("/missing-content-999999");
  expect(notFoundResponse?.status()).toBe(404);
});
