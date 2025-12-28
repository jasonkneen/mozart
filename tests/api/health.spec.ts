import { test, expect } from "@playwright/test";

test("API smoke: health check", async ({ request }) => {
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

  // Customize this endpoint for your API
  const res = await request.get(`${baseUrl}/health`);

  // Accept 200-299 as success
  expect(res.status()).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(300);
});
