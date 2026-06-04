import { expect, test } from "@playwright/test";

test("renders the public TechHub feed", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "최신 개발 콘텐츠" })).toBeVisible();
  await expect(page.getByText("Next.js App Router 운영 패턴")).toBeVisible();
});
