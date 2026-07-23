import { test, expect } from "@playwright/test";

const baseUrl = "http://127.0.0.1:8000/docs/";

async function expectHomeTopbarGeometry(page) {
  const avatarImage = page.locator(".topbar-avatar img");
  const logoImage = page.locator(".topbar-logo img");
  await avatarImage.evaluate((image) => image.decode());
  await logoImage.evaluate((image) => image.decode());
  await expect(avatarImage).toHaveJSProperty("naturalWidth", 256);
  await expect(avatarImage).toHaveJSProperty("naturalHeight", 256);
  await expect(logoImage).toHaveJSProperty("naturalWidth", 128);
  await expect(logoImage).toHaveJSProperty("naturalHeight", 120);

  const boxes = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    return {
      header: rect(".home-topbar"),
      avatar: rect(".topbar-avatar"),
      logo: rect(".topbar-logo"),
      logoImage: rect(".topbar-logo img"),
      theme: rect(".topbar-theme"),
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  for (const name of ["header", "avatar", "logo", "logoImage", "theme"]) {
    expect(boxes[name], name + " must have a layout box").not.toBeNull();
  }

  const headerCenter = boxes.header.left + (boxes.header.width / 2);
  const logoCenter = boxes.logoImage.left + (boxes.logoImage.width / 2);
  expect(Math.abs(headerCenter - logoCenter)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes.header.height - 56)).toBeLessThanOrEqual(0.5);
  expect(boxes.avatar.width).toBe(44);
  expect(boxes.logo.width).toBe(44);
  expect(boxes.theme.width).toBe(44);
  expect(boxes.avatar.right <= boxes.logo.left).toBeTruthy();
  expect(boxes.logo.right <= boxes.theme.left).toBeTruthy();
  expect(boxes.hasHorizontalOverflow).toBeFalsy();
}

test("desktop home shows a compact header and three columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}index.html`, { waitUntil: "networkidle" });

  await expect(page.locator(".home-topbar h1")).toHaveAttribute("class", "visually-hidden");
  await expect(page.locator(".home-topbar h1")).toHaveCSS("position", "absolute");
  await expectHomeTopbarGeometry(page);
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

  await expectHomeTopbarGeometry(page);
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

test("home topbar stays centered and persists its light theme at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${baseUrl}index.html`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("blog-theme"));
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".topbar-logo img")).toHaveCSS("filter", "none");
  await expectHomeTopbarGeometry(page);

  await page.locator(".topbar-theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".topbar-logo img")).toHaveCSS("filter", "brightness(0)");
  expect(await page.evaluate(() => localStorage.getItem("blog-theme"))).toBe("light");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".topbar-logo img")).toHaveCSS("filter", "brightness(0)");
  await expectHomeTopbarGeometry(page);
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
