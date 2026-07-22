import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:8000/docs/", { waitUntil: "networkidle" });
});

test("desktop timeline has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".app-shell")).toHaveScreenshot("desktop-home.png", {
    maxDiffPixelRatio: 0.01,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test("mobile navigation leaves the final post action visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".post-item:last-child .copy-action").scrollIntoViewIfNeeded();
  const nav = await page.locator(".mobile-nav").boundingBox();
  const action = await page.locator(".post-item:last-child .copy-action").boundingBox();
  expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
  await expect(page.locator(".app-shell")).toHaveScreenshot("mobile-home.png", {
    maxDiffPixelRatio: 0.01,
  });
});
