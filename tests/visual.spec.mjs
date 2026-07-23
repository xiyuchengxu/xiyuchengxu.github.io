import { test, expect } from "@playwright/test";

const baseUrl = "http://127.0.0.1:8000/docs/";

test("desktop home shows a compact header and three columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}index.html`, { waitUntil: "networkidle" });

  await expect(page.locator(".timeline-header")).toContainText("YuCheng 的博客");
  await expect(page.locator(".timeline-header")).not.toContainText("个人技术笔记");
  await expect(page.locator(".rail")).toBeVisible();
  await expect(page.locator(".sidebar-nav .nav-icon")).toHaveCount(5);
  await expect(page.locator(".sidebar-nav .nav-link span")).toHaveCount(5);
  await expect(page.locator(".app-shell")).toHaveScreenshot("desktop-home.png", {
    maxDiffPixelRatio: 0,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test("mobile home navigation is icon-only", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}index.html`, { waitUntil: "networkidle" });

  await expect(page.locator(".mobile-nav a")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-icon")).toHaveCount(5);
  await expect(page.locator(".mobile-nav a[aria-current='page'] .nav-icon")).toHaveCount(1);
  await expect(page.locator(".mobile-nav .nav-label")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-label").first()).toHaveCSS("position", "absolute");
  await expect(page.locator(".mobile-nav a").first()).toHaveCSS("min-width", "48px");
  await expect(page).toHaveScreenshot("mobile-home.png", {
    maxDiffPixelRatio: 0,
  });
});

test("mobile search filters an article", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}search.html`, { waitUntil: "networkidle" });
  await page.locator("#postSearch").fill("Markdown");

  await expect(page.locator(".post-item")).toHaveCount(1);
  await expect(page.locator(".mobile-nav a")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-icon")).toHaveCount(5);
  await expect(page.locator(".mobile-nav a[aria-current='page'] .nav-icon")).toHaveCount(1);
  await expect(page.locator(".mobile-nav .nav-label")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-label").first()).toHaveCSS("position", "absolute");
  await expect(page.locator(".mobile-nav a").first()).toHaveCSS("min-width", "48px");
  await expect(page).toHaveScreenshot("mobile-search-results.png", {
    maxDiffPixelRatio: 0,
  });
});

test("mobile tags page honors an encoded tag query", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}tags.html?tag=Web%20%E5%BC%80%E5%8F%91`, {
    waitUntil: "networkidle",
  });

  await expect(page.locator(".post-item")).toHaveCount(1);
  await expect(page.locator(".mobile-nav a")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-icon")).toHaveCount(5);
  await expect(page.locator(".mobile-nav a[aria-current='page'] .nav-icon")).toHaveCount(1);
  await expect(page.locator(".mobile-nav .nav-label")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-label").first()).toHaveCSS("position", "absolute");
  await expect(page.locator(".mobile-nav a").first()).toHaveCSS("min-width", "48px");
  await expect(page).toHaveScreenshot("mobile-tags-filtered.png", {
    maxDiffPixelRatio: 0,
  });
});
