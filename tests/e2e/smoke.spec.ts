import { test, expect } from "@playwright/test";

test("E2E smoke: app loads", async ({ page }) => {
  await page.goto("/");

  // Verify page loaded (customize selectors for your app)
  await expect(page).toHaveTitle(/.+/);
});

test("E2E smoke: no console errors on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Filter out known non-critical errors if needed
  const criticalErrors = errors.filter(
    (e) => !e.includes("favicon") && !e.includes("404")
  );

  expect(criticalErrors).toHaveLength(0);
});
