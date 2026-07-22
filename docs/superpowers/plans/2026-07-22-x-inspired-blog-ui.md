# X 风格博客界面升级实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `docs/index.html` 升级为适合技术写作的高密度信息流首页，借鉴 X 的导航与反馈节奏，但不复制其品牌或伪造社交互动。

**架构：** 保持 `posts/*.md -> scripts/build.py -> docs/posts.js + docs/posts/*.html` 的发布链不变。首页只从生成的 `posts` 和 `popularTags` 常量派生文章、标签、归档和搜索结果；HTML 提供无 JavaScript 的基础导航和三个骨架项，`script.js` 在加载后渲染真实文章、筛选与操作。CSS 使用三栏到单栏的响应式栅格和 CSS 自定义属性实现深浅主题。

**技术栈：** 静态 HTML、原生 CSS、原生 JavaScript、Python 3、`unittest`、Markdown、PyYAML、GitHub Actions、Playwright（仅本地截图验证）。

---

## 文件结构

- 修改：`docs/index.html`：语义化的三栏首页、无 JavaScript 降级导航、移动端底部导航、文章骨架和实时提示区域。
- 修改：`docs/styles.css`：中性深浅主题、三栏布局、信息流、焦点样式、骨架、空状态和响应式断点。
- 修改：`docs/script.js`：文章流渲染、主题持久化、栏目/标签/搜索筛选、复制链接和非阻塞提示。
- 创建：`tests/test_frontend_contract.py`：对首页结构、前端 API、无伪社交互动和响应式关键类名的静态契约测试。
- 创建：`tests/test_visual_regression.py`：Playwright 截图命令的可选包装器，只在 `PLAYWRIGHT_BROWSER=1` 时运行。
- 创建：`tests/visual.spec.mjs`：桌面与移动截图、页面无水平溢出、固定导航不遮挡文章操作行的浏览器断言。
- 创建：`package.json`：仅定义本地 `test:visual` 脚本及 `@playwright/test` 开发依赖，不进入浏览器端运行时。
- 修改：`docs/superpowers/specs/2026-07-22-x-inspired-blog-ui-design.md`：将规格状态改为“已批准，实施中”。

## 全局约束

- 不修改 `posts/`、`scripts/build.py`、`docs/posts.js`、`docs/posts/*.html`、`templates/` 或 `.github/workflows/build-posts.yml`。
- 不新增账户、评论、关注、点赞、转发、浏览量或任何伪造社交统计。
- 不引入浏览器端框架、图标 CDN、第三方字体、远程图片或 X 的商标/素材。
- 首页仍使用 `post.title`、`post.summary`、`post.date`、`post.tags`、`post.url`、`post.author`；缺失的可选字段不能显示猜测值。
- 所有纯图标按钮必须使用 `aria-label` 和 `title`；键盘焦点必须可见。
- 实现任务必须在 10 分钟内形成一个可验证检查点；每个任务完成后运行其指定测试再提交。

### 任务 1：前端契约测试与语义化首页壳

**文件：**
- 创建：`tests/test_frontend_contract.py`
- 修改：`docs/index.html`

- [ ] **步骤 1：创建失败的首页结构契约测试**

```python
import unittest
from pathlib import Path


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = Path("docs/index.html").read_text(encoding="utf-8")
        cls.script = Path("docs/script.js").read_text(encoding="utf-8")
        cls.styles = Path("docs/styles.css").read_text(encoding="utf-8")

    def test_homepage_has_semantic_three_column_and_mobile_navigation(self):
        for snippet in (
            '<nav class="sidebar-nav" aria-label="主导航">',
            '<main class="timeline" id="mainContent">',
            '<aside class="rail" aria-label="博客辅助信息">',
            '<nav class="mobile-nav" aria-label="移动端导航">',
            'data-view="search"',
            'data-view="archive"',
            'data-view="tags"',
            'data-view="about"',
        ):
            self.assertIn(snippet, self.index)

    def test_homepage_contains_three_non_javascript_skeleton_items(self):
        self.assertEqual(self.index.count('class="skeleton-post"'), 3)
        self.assertIn('aria-busy="true"', self.index)
        self.assertIn('<noscript>', self.index)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract -v
```

预期：`FAIL`，错误指出 `docs/index.html` 尚未包含 `sidebar-nav`、`timeline`、`rail`、`mobile-nav` 和骨架结构。

- [ ] **步骤 3：重构首页为语义化布局，并保留无 JavaScript 导航**

将 `docs/index.html` 的 `<body>` 替换为以下结构。使用内联字符实体作为通用图标，不嵌入品牌图形：

```html
<body>
  <div class="app-shell">
    <header class="mobile-header">
      <a class="wordmark" href="index.html">YuCheng 的博客</a>
      <button class="icon-button" id="themeToggle" type="button" aria-label="切换主题" title="切换主题">◐</button>
    </header>

    <aside class="sidebar" aria-label="站点导航">
      <a class="wordmark" href="index.html">YuCheng 的博客</a>
      <nav class="sidebar-nav" aria-label="主导航">
        <a class="nav-link is-active" href="index.html" data-view="home">⌂<span>首页</span></a>
        <a class="nav-link" href="#articles" data-view="articles">▤<span>文章</span></a>
        <a class="nav-link" href="#tags" data-view="tags">#<span>标签</span></a>
        <a class="nav-link" href="#archive" data-view="archive">◷<span>归档</span></a>
        <a class="nav-link" href="#about" data-view="about">i<span>关于</span></a>
      </nav>
      <button class="theme-button" id="themeToggleDesktop" type="button" aria-label="切换主题" title="切换主题">◐<span>主题</span></button>
    </aside>

    <main class="timeline" id="mainContent">
      <header class="timeline-header">
        <div><p class="eyebrow">个人技术笔记</p><h1>YuCheng 的博客</h1></div>
        <button class="icon-button" id="searchToggle" type="button" aria-label="搜索文章" title="搜索文章">⌕</button>
      </header>
      <form class="search-panel" id="searchPanel" role="search" hidden>
        <label for="postSearch">搜索文章</label>
        <input id="postSearch" name="q" type="search" autocomplete="off" placeholder="按标题、摘要或标签搜索">
      </form>
      <nav class="topic-tabs" aria-label="文章栏目">
        <button class="topic-tab is-active" type="button" data-filter="all" aria-pressed="true">全部文章</button>
        <button class="topic-tab" type="button" data-filter="technical" aria-pressed="false">技术笔记</button>
        <button class="topic-tab" type="button" data-filter="notes" aria-pressed="false">随想</button>
      </nav>
      <section class="post-list" id="postsList" aria-live="polite" aria-busy="true">
        <article class="skeleton-post" aria-hidden="true"><div class="skeleton-line skeleton-meta"></div><div class="skeleton-line skeleton-title"></div><div class="skeleton-line skeleton-body"></div><div class="skeleton-line skeleton-actions"></div></article>
        <article class="skeleton-post" aria-hidden="true"><div class="skeleton-line skeleton-meta"></div><div class="skeleton-line skeleton-title"></div><div class="skeleton-line skeleton-body"></div><div class="skeleton-line skeleton-actions"></div></article>
        <article class="skeleton-post" aria-hidden="true"><div class="skeleton-line skeleton-meta"></div><div class="skeleton-line skeleton-title"></div><div class="skeleton-line skeleton-body"></div><div class="skeleton-line skeleton-actions"></div></article>
      </section>
      <noscript><p class="noscript-message">文章目录需要 JavaScript 加载。请直接查看 <a href="posts/2024-01-15-hello-world.html">现有文章</a>。</p></noscript>
    </main>

    <aside class="rail" aria-label="博客辅助信息">
      <section class="author-summary" id="about"><p class="eyebrow">作者</p><h2>YuCheng</h2><p>记录编程、建站与持续学习。</p><a href="mailto:hello@example.com">联系我</a></section>
      <section id="tags"><h2>标签</h2><div class="tag-list" id="tagCloud"></div></section>
      <section id="archive"><h2>归档</h2><div class="archive-list" id="archiveList"></div></section>
      <section><h2>最近文章</h2><ol class="recent-posts" id="recentPosts"></ol></section>
    </aside>
  </div>

  <nav class="mobile-nav" aria-label="移动端导航">
    <a class="nav-link is-active" href="index.html" data-view="home" aria-label="首页" title="首页">⌂<span>首页</span></a>
    <button class="nav-link" type="button" data-view="search" aria-label="搜索" title="搜索">⌕<span>搜索</span></button>
    <a class="nav-link" href="#archive" data-view="archive" aria-label="归档" title="归档">◷<span>归档</span></a>
    <a class="nav-link" href="#tags" data-view="tags" aria-label="标签" title="标签">#<span>标签</span></a>
    <a class="nav-link" href="#about" data-view="about" aria-label="关于" title="关于">i<span>关于</span></a>
  </nav>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  <script src="posts.js"></script>
  <script src="script.js"></script>
</body>
```

保留 `<head>` 中的 `styles.css` 引用、页面语言和视口 meta 标签。

- [ ] **步骤 4：运行首页结构测试验证通过**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract -v
```

预期：`OK`，2 个测试通过。

- [ ] **步骤 5：提交语义化页面壳与测试**

```bash
git add docs/index.html tests/test_frontend_contract.py
git commit -m "feat(博客): 重构首页语义布局"
```

### 任务 2：信息流、筛选、搜索、复制链接与主题逻辑

**文件：**
- 修改：`tests/test_frontend_contract.py`
- 修改：`docs/script.js`

- [ ] **步骤 1：扩展失败的交互契约测试**

向 `FrontendContractTests` 添加：

```python
    def test_script_exposes_real_blog_actions_without_social_counters(self):
        for snippet in (
            "function renderPosts(filteredPosts)",
            "function matchesFilter(post, filter)",
            "function filterPosts()",
            "navigator.clipboard.writeText",
            "function showToast(message)",
            "localStorage.setItem(\"blog-theme\"",
            "post.url",
            "post.title",
            "post.summary",
        ):
            self.assertIn(snippet, self.script)
        for forbidden in ("handleLike", "like-count", "repost-btn", "reply-btn", "post.stats"):
            self.assertNotIn(forbidden, self.script)
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_script_exposes_real_blog_actions_without_social_counters -v
```

预期：`FAIL`，当前脚本含 `handleLike` 和 `post.stats`，且没有筛选、复制链接和提示 API。

- [ ] **步骤 3：以以下接口替换 `docs/script.js` 的文章与交互逻辑**

```javascript
const state = { filter: "all", query: "" };
const technicalTags = new Set(["Python", "JavaScript", "CSS", "HTML", "建站", "开发", "技术"]);
const notesTags = new Set(["随想", "生活", "学习", "记录"]);

function normalize(value) {
  return String(value || "").toLocaleLowerCase();
}

function matchesFilter(post, filter) {
  if (filter === "all") return true;
  const tags = post.tags || [];
  const taxonomy = filter === "technical" ? technicalTags : notesTags;
  return tags.some((tag) => taxonomy.has(tag));
}

function filterPosts() {
  const query = normalize(state.query);
  return posts.filter((post) => {
    const searchable = [post.title, post.summary, ...(post.tags || [])].map(normalize).join(" ");
    return matchesFilter(post, state.filter) && searchable.includes(query);
  });
}

function postMarkup(post) {
  const tags = (post.tags || []).map((tag) => `<button class="tag" type="button" data-tag="${tag}">#${tag}</button>`).join("");
  return `<article class="post-item">
    <div class="post-meta"><span class="avatar" aria-hidden="true">Y</span><span><strong>${post.author.name}</strong> <span>${post.author.handle}</span> · <time datetime="${post.date}">${post.date}</time></span></div>
    <a class="post-link" href="${post.url}"><h2>${post.title}</h2><p>${post.summary}</p></a>
    <div class="post-tags">${tags}</div>
    <div class="post-actions"><a class="read-action" href="${post.url}">阅读文章 <span aria-hidden="true">→</span></a><button class="copy-action" type="button" data-url="${post.url}">复制链接</button></div>
  </article>`;
}

function renderPosts(filteredPosts) {
  const list = document.getElementById("postsList");
  if (!list) return;
  list.setAttribute("aria-busy", "false");
  list.innerHTML = filteredPosts.length
    ? filteredPosts.map(postMarkup).join("")
    : '<section class="empty-state"><h2>没有匹配的文章</h2><p>试试清除筛选或搜索其他关键词。</p><button type="button" id="clearFilters">清除筛选</button></section>';
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 1800);
}

async function copyPostLink(url) {
  const absoluteUrl = new URL(url, window.location.href).href;
  try {
    await navigator.clipboard.writeText(absoluteUrl);
    showToast("链接已复制");
  } catch {
    showToast("无法复制链接");
  }
}
```

在 `DOMContentLoaded` 内：从 `localStorage.getItem("blog-theme")` 恢复深浅主题；为栏目、搜索框、标签按钮、清除筛选和复制按钮注册事件；每次状态变化调用 `renderPosts(filterPosts())`、`renderTags()`、`renderArchive()`、`renderRecentPosts()`。主题只在 `dark` 与 `light` 间切换，并以 `localStorage.setItem("blog-theme", nextTheme)` 保存。

- [ ] **步骤 4：运行交互契约和现有构建测试验证通过**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest discover -s tests -v
```

预期：所有测试通过，且输出没有失败或错误。

- [ ] **步骤 5：提交信息流交互**

```bash
git add docs/script.js tests/test_frontend_contract.py
git commit -m "feat(博客): 添加文章筛选与真实操作"
```

### 任务 3：响应式信息流样式、主题与无障碍反馈

**文件：**
- 修改：`tests/test_frontend_contract.py`
- 修改：`docs/styles.css`

- [ ] **步骤 1：添加失败的 CSS 契约测试**

向 `FrontendContractTests` 添加：

```python
    def test_styles_define_three_column_mobile_and_accessible_states(self):
        for snippet in (
            ".app-shell",
            "grid-template-columns: minmax(180px, 0.72fr) minmax(0, 640px) minmax(240px, 0.9fr)",
            ".post-item",
            ".skeleton-post",
            ".empty-state",
            ".mobile-nav",
            "@media (max-width: 980px)",
            "@media (max-width: 700px)",
            ":focus-visible",
            "prefers-reduced-motion: reduce",
        ):
            self.assertIn(snippet, self.styles)
        self.assertNotIn("linear-gradient", self.styles)
```

- [ ] **步骤 2：运行 CSS 测试验证失败**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_styles_define_three_column_mobile_and_accessible_states -v
```

预期：`FAIL`，当前样式使用 Flex 主布局并包含渐变头像，缺少目标断点和减弱动画规则。

- [ ] **步骤 3：替换为可读的三栏到单栏样式体系**

在 `docs/styles.css` 中使用以下关键样式；删除现有 `linear-gradient`、社交操作色和卡片阴影变量：

```css
:root {
  --bg: #000;
  --surface: #16181c;
  --surface-hover: #1d1f23;
  --text: #e7e9ea;
  --muted: #8b98a5;
  --line: #2f3336;
  --accent: #1d9bf0;
  --focus: #71c9ff;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

[data-theme="light"] {
  --bg: #fff;
  --surface: #f7f9f9;
  --surface-hover: #eff3f4;
  --text: #0f1419;
  --muted: #536471;
  --line: #dfe5e8;
  --accent: #1479bd;
  --focus: #075e9f;
}

.app-shell {
  width: min(1280px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(180px, 0.72fr) minmax(0, 640px) minmax(240px, 0.9fr);
}

.sidebar, .timeline, .rail { min-width: 0; }
.sidebar { position: sticky; top: 0; align-self: start; min-height: 100vh; padding: 1rem; border-right: 1px solid var(--line); }
.timeline { border-right: 1px solid var(--line); }
.timeline-header { position: sticky; top: 0; z-index: 10; min-height: 64px; padding: .75rem 1rem; display: flex; align-items: center; justify-content: space-between; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.post-item, .skeleton-post { padding: 1rem; border-bottom: 1px solid var(--line); }
.post-item:hover { background: var(--surface-hover); }
.post-link { display: block; color: inherit; text-decoration: none; }
.post-link h2 { margin: .55rem 0 .35rem; font-size: 1.125rem; line-height: 1.35; }
.post-link p { color: var(--muted); line-height: 1.6; }
.post-actions { display: flex; gap: 1rem; margin-top: .8rem; }
.read-action, .copy-action { min-height: 40px; display: inline-flex; align-items: center; color: var(--accent); }
.tag { border: 0; padding: .25rem 0; color: var(--accent); background: transparent; }
.skeleton-line { height: .8rem; margin: .55rem 0; border-radius: 2px; background: var(--surface); }
.skeleton-meta { width: 36%; } .skeleton-title { width: 68%; height: 1.1rem; } .skeleton-body { width: 92%; } .skeleton-actions { width: 28%; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }

@media (max-width: 980px) { .rail { display: none; } .app-shell { grid-template-columns: minmax(168px, .55fr) minmax(0, 640px); } }
@media (max-width: 700px) {
  .app-shell { display: block; padding-top: 56px; padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
  .sidebar { display: none; } .rail { display: block; border-top: 1px solid var(--line); padding: 1rem; }
  .mobile-header, .mobile-nav { display: flex; }
  .mobile-header { position: fixed; inset: 0 0 auto; height: 56px; z-index: 20; align-items: center; justify-content: space-between; padding: 0 .85rem; background: var(--bg); border-bottom: 1px solid var(--line); }
  .mobile-nav { position: fixed; inset: auto 0 0; z-index: 20; min-height: 64px; justify-content: space-around; padding-bottom: env(safe-area-inset-bottom); background: var(--bg); border-top: 1px solid var(--line); }
  .mobile-nav .nav-link { min-width: 48px; min-height: 56px; display: grid; place-items: center; font-size: .75rem; }
  .topic-tabs { overflow-x: auto; scrollbar-width: none; } .topic-tab { flex: 0 0 auto; min-width: 7.5rem; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
```

补齐 `.avatar`、`.post-meta`、`.search-panel`、`.empty-state`、`.toast`、`.nav-link`、`.topic-tab` 和 `.rail section` 的同一配色样式。任何可点击控件的触控高度不得低于 `40px`；移动端底部导航按钮不得低于 `48px`。

- [ ] **步骤 4：运行 CSS 契约与全量测试验证通过**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest discover -s tests -v
python -m py_compile scripts/build.py
python scripts/build.py
git diff --check
```

预期：测试全部通过，编译和构建返回 `0`，格式检查没有输出。

- [ ] **步骤 5：提交响应式样式**

```bash
git add docs/styles.css tests/test_frontend_contract.py
git commit -m "feat(博客): 升级响应式信息流样式"
```

### 任务 4：浏览器截图验证与规格状态

**文件：**
- 创建：`package.json`
- 创建：`tests/visual.spec.mjs`
- 创建：`tests/test_visual_regression.py`
- 修改：`docs/superpowers/specs/2026-07-22-x-inspired-blog-ui-design.md`

- [ ] **步骤 1：创建失败的视觉验证包装测试**

```python
import os
import subprocess
import unittest


class VisualRegressionTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("PLAYWRIGHT_BROWSER") == "1", "set PLAYWRIGHT_BROWSER=1 to run browser screenshots")
    def test_playwright_visual_suite(self):
        result = subprocess.run(["npm", "run", "test:visual"], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
```

- [ ] **步骤 2：运行包装测试验证跳过行为**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_visual_regression -v
```

预期：`OK (skipped=1)`，明确说明只有 `PLAYWRIGHT_BROWSER=1` 才运行浏览器截图。

- [ ] **步骤 3：添加本地 Playwright 配置与视觉断言**

创建 `package.json`：

```json
{
  "private": true,
  "scripts": {
    "test:visual": "playwright test tests/visual.spec.mjs"
  },
  "devDependencies": {
    "@playwright/test": "1.54.1"
  }
}
```

创建 `tests/visual.spec.mjs`：

```javascript
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:8000/docs/", { waitUntil: "networkidle" });
});

test("desktop timeline has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".app-shell")).toHaveScreenshot("desktop-home.png", { maxDiffPixelRatio: 0.01 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("mobile navigation leaves the final post action visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".post-item:last-child .copy-action").scrollIntoViewIfNeeded();
  const nav = await page.locator(".mobile-nav").boundingBox();
  const action = await page.locator(".post-item:last-child .copy-action").boundingBox();
  expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
  await expect(page.locator(".app-shell")).toHaveScreenshot("mobile-home.png", { maxDiffPixelRatio: 0.01 });
});
```

更新规格状态为：

```markdown
**状态：** 已获用户确认，实施中
```

- [ ] **步骤 4：运行静态、构建和视觉验证**

在终端 A 中运行：

```bash
python -m http.server 8000 --directory .
```

在终端 B 中运行：

```bash
npm install
npx playwright install chromium
npx playwright test tests/visual.spec.mjs --update-snapshots
PLAYWRIGHT_BROWSER=1 /tmp/yucheng-blog-venv/bin/python -m unittest discover -s tests -v
python scripts/build.py
git diff --exit-code -- docs/posts.js docs/posts
```

预期：首次命令在 `tests/visual.spec.mjs-snapshots/` 生成桌面和移动基线快照；随后包装测试以正常 Playwright 模式再次运行并验证截图、水平溢出与底部导航位置。构建后 `docs/posts.js` 和 `docs/posts/` 无差异。

- [ ] **步骤 5：提交验证资产与规格状态**

```bash
git add package.json package-lock.json tests/test_visual_regression.py tests/visual.spec.mjs tests/visual.spec.mjs-snapshots docs/superpowers/specs/2026-07-22-x-inspired-blog-ui-design.md
git commit -m "test(博客): 添加界面截图验证"
```

### 任务 5：分支级验证与发布交接

**文件：**
- 修改：无

- [ ] **步骤 1：执行完整项目验证**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest discover -s tests -v
python -m py_compile scripts/build.py
python scripts/build.py
cp docs/posts.js /tmp/posts-before.js
python scripts/build.py
diff -u /tmp/posts-before.js docs/posts.js
git diff --check
git status --short
```

预期：测试全部通过、编译成功、两次构建的 `posts.js` 无差异、格式检查无输出、工作区干净。

- [ ] **步骤 2：审查已合并分支的改动范围**

运行：

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
git log --oneline main..HEAD
```

预期：只包含 UI、前端契约测试、视觉验证工具和规格状态改动；不包含 Markdown 内容源、生成详情页或 Actions 工作流改动。

- [ ] **步骤 3：提交前审查结论**

确认以下条件均满足后才进入分支收尾流程：

```text
- 所有测试通过，且浏览器视觉套件在可用环境运行成功。
- 首页不含 like/repost/reply/虚构统计字段。
- 首页每个生成 URL 都仍指向 docs/posts/ 下的生成详情页。
- 主题、搜索、栏目/标签筛选、复制链接、空状态和键盘焦点均有静态契约覆盖。
- 宽屏三栏、中屏双栏、窄屏单栏与底部导航均有验证。
```

- [ ] **步骤 4：使用完成分支流程集成**

完成验证后使用 `superpowers:finishing-a-development-branch`：提供本地合并、PR、保留分支或丢弃四个选项。仅当用户选择合并或推送时，才修改 `main` 或与远程交互。