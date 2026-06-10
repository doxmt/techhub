import { expect, test } from "@playwright/test";

test("renders the public TechHub feed", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "최신 개발 뉴스" })).toBeVisible();
  await expect(page.getByText("TanStack Query v5 마이그레이션 가이드")).toBeHidden();
});

test("switches public hub sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "최신 뉴스" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "아티클" }).click();
  await expect(page).toHaveURL(/section=article/);
  await expect(page.getByRole("link", { name: "아티클" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("TanStack Query v5 마이그레이션 가이드")).toBeVisible();

  await page.getByRole("link", { name: "공모전" }).click();
  await expect(page).toHaveURL(/section=contest/);
  await expect(page.getByRole("heading", { name: "공모전 데이터 준비중" })).toBeVisible();
  await expect(page.getByRole("button", { name: "더 보기" })).toBeHidden();
});

test("loads a second feed page", async ({ page }) => {
  await page.goto("/?section=article");

  const cards = page.locator("a:has(article)");
  await expect(cards).toHaveCount(20);

  await page.getByRole("button", { name: "더 보기" }).click();

  await expect(page.getByText("React Server Components 완벽 가이드")).toBeVisible();
  await expect(cards).toHaveCount(21);
  await expect(page.getByRole("button", { name: "더 보기" })).toBeHidden();
});

test("keeps filters and search in the URL", async ({ page }) => {
  await page.goto("/?section=article");

  await page.getByRole("link", { name: "네이버 D2" }).click();
  await expect(page).toHaveURL(/source=/);

  await page.getByRole("link", { name: "Frontend" }).click();
  await expect(page).toHaveURL(/categories=fe/);

  await page.getByRole("link", { name: "최신 뉴스" }).click();
  await expect(page).not.toHaveURL(/source=/);
  await expect(page).not.toHaveURL(/categories=fe/);
  await expect(page.getByRole("navigation", { name: "출처" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "주제" })).toBeHidden();

  await page.getByRole("link", { name: "아티클" }).click();

  await page.getByRole("link", { name: "Frontend" }).click();
  await expect(page).toHaveURL(/categories=fe/);

  await page.getByPlaceholder("뉴스, 기술명, 회사명, 태그 검색").fill("React");
  await page.getByPlaceholder("뉴스, 기술명, 회사명, 태그 검색").press("Enter");

  await expect(page).toHaveURL(/categories=fe/);
  await expect(page).toHaveURL(/section=article/);
  await expect(page).toHaveURL(/q=React/);
});

test("handles content detail canonical redirect and 404", async ({ page }) => {
  await page.goto("/?section=article");

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
