import { test } from "@playwright/test";

test("simple test", async ({ page }) => {
  await page.goto("http://localhost:8080");
});