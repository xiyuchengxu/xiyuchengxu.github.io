# 多页面导航与精简首页实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将博客首页收敛为文章信息流，并提供独立的搜索、归档、标签和关于页面，以及纯图标移动底部导航。

**架构：** 保留 `docs/posts.js` 作为唯一文章数据源。五个静态 HTML 页面共享导航壳、主题状态和原生 JavaScript 工具函数；`script.js` 按每页的 `data-page` 初始化对应渲染器。现有 Markdown 构建器、文章详情页和 GitHub Actions 构建链不改动。

**技术栈：** 原生 HTML/CSS/JavaScript、Python `unittest`、Playwright、系统 Chromium、GitHub Pages。

---

## 文件结构

- 修改：`docs/index.html`：首页壳，只保留顶部栏、文章骨架/文章流及桌面摘要入口。
- 创建：`docs/search.html`：独立搜索页，含搜索输入、文章结果容器和无 JavaScript 降级内容。
- 创建：`docs/archive.html`：独立归档页，含按月分组的文章容器。
- 创建：`docs/tags.html`：独立标签页，含标签统计与筛选结果容器。
- 创建：`docs/about.html`：独立关于页，含固定站点及作者信息，不依赖文章数据。
- 修改：`docs/script.js`：共享导航、主题、文章工具与五个页面初始化函数。
- 修改：`docs/styles.css`：多页面三栏/双栏/单栏布局、纯图标移动导航、筛选与空状态样式。
- 修改：`tests/test_frontend_contract.py`：页面结构、导航语义、独立页面行为与共享脚本契约。
- 修改：`tests/visual.spec.mjs`：首页和独立页面的桌面/移动浏览器断言与截图。
- 创建：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`：更新后的移动首页截图基线。
- 创建：`tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`：移动搜索结果截图基线。
- 创建：`tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`：移动标签筛选截图基线。

`posts/*.md`、`scripts/build.py`、`templates/post-template.html`、`docs/posts.js`、`docs/posts/`、`.github/workflows/build-posts.yml` 和 `playwright.config.mjs` 均不在本次实现范围内。

## 全局约束

- 移动端底部导航必须是五个 `<a>` 链接，只显示图标；每个链接具有 `aria-label`、`title` 和当前页的 `aria-current="page"`。
- 首页顶栏只显示「YuCheng 的博客」和右侧主题按钮；不得保留 `个人技术笔记`、重复站点标题或搜索按钮。
- 移动首页不得呈现搜索、标签、归档、完整关于内容或右栏；桌面端右栏只显示跳转入口。
- 标签 URL 必须通过 `encodeURIComponent` 生成，标签页和归档页必须读取 `URLSearchParams`。
- 主题继续使用 `localStorage` 键 `blog-theme`；每个页面均有同一主题切换行为。
- 不使用外部图标库、前端框架、伪社交统计、渐变或大圆角卡片。
- 所有页面只加载 `styles.css`；搜索、归档、标签和首页先加载 `posts.js` 再加载 `script.js`；关于页只加载 `script.js`。

### 任务 1：建立五页 HTML 壳与可访问导航

**文件：**
- 修改：`docs/index.html`
- 创建：`docs/search.html`
- 创建：`docs/archive.html`
- 创建：`docs/tags.html`
- 创建：`docs/about.html`
- 修改：`tests/test_frontend_contract.py`

- [ ] **步骤 1：编写五页结构与导航的失败测试**

在 `tests/test_frontend_contract.py` 中新增页面映射和测试，固定所有页面均存在、页面类型正确、移动导航只有图标并带可访问名称：

```python
from pathlib import Path

PAGES = {
    "home": Path("docs/index.html"),
    "search": Path("docs/search.html"),
    "archive": Path("docs/archive.html"),
    "tags": Path("docs/tags.html"),
    "about": Path("docs/about.html"),
}


def test_all_navigation_pages_exist_with_expected_page_type(self):
    for page_name, path in PAGES.items():
        html = path.read_text(encoding="utf-8")
        self.assertIn(f'data-page="{page_name}"', html)
        self.assertIn('<nav class="mobile-nav" aria-label="移动端导航">', html)
        self.assertIn('aria-label="首页"', html)
        self.assertIn('aria-label="搜索"', html)
        self.assertIn('aria-label="归档"', html)
        self.assertIn('aria-label="标签"', html)
        self.assertIn('aria-label="关于"', html)
        self.assertIn('class="nav-label visually-hidden"', html)


def test_homepage_is_limited_to_post_stream_and_compact_header(self):
    html = PAGES["home"].read_text(encoding="utf-8")
    self.assertIn('<h1>YuCheng 的博客</h1>', html)
    self.assertNotIn('个人技术笔记', html)
    self.assertNotIn('id="postSearch"', html)
    self.assertNotIn('id="topic-tabs"', html)
    self.assertNotIn('id="tagCloud"', html)
    self.assertNotIn('id="archiveList"', html)
    self.assertIn('id="rightRail"', html)
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_all_navigation_pages_exist_with_expected_page_type tests.test_frontend_contract.FrontendContractTests.test_homepage_is_limited_to_post_stream_and_compact_header -v
```

预期：FAIL，`docs/search.html`、`docs/archive.html`、`docs/tags.html` 和 `docs/about.html` 不存在，或首页仍包含搜索/主题标签/归档容器。

- [ ] **步骤 3：创建最小共享页面壳**

在每个 HTML 页面加入统一壳。首页主体使用如下结构；其他页面复用 `app-shell`、桌面侧栏、`main`、右栏占位和移动导航，只替换 `data-page`、标题及中栏内容容器。

```html
<body data-page="home">
  <div class="app-shell">
    <aside class="sidebar" aria-label="桌面导航">
      <a class="wordmark" href="index.html">YuCheng</a>
      <nav class="sidebar-nav" aria-label="主导航">
        <a class="nav-link" href="index.html" aria-current="page">⌂<span>首页</span></a>
        <a class="nav-link" href="search.html">⌕<span>搜索</span></a>
        <a class="nav-link" href="archive.html">◷<span>归档</span></a>
        <a class="nav-link" href="tags.html">#<span>标签</span></a>
        <a class="nav-link" href="about.html">i<span>关于</span></a>
      </nav>
    </aside>

    <main class="timeline" id="mainContent">
      <header class="timeline-header">
        <h1>YuCheng 的博客</h1>
        <button class="icon-button" type="button" data-theme-toggle aria-label="切换主题" title="切换主题">◐</button>
      </header>
      <section id="pageContent" class="post-list" aria-live="polite" aria-busy="true">
        <article class="skeleton-post" aria-hidden="true"><span class="skeleton-line skeleton-meta"></span><span class="skeleton-line skeleton-title"></span><span class="skeleton-line skeleton-body"></span></article>
        <article class="skeleton-post" aria-hidden="true"><span class="skeleton-line skeleton-meta"></span><span class="skeleton-line skeleton-title"></span><span class="skeleton-line skeleton-body"></span></article>
        <article class="skeleton-post" aria-hidden="true"><span class="skeleton-line skeleton-meta"></span><span class="skeleton-line skeleton-title"></span><span class="skeleton-line skeleton-body"></span></article>
      </section>
    </main>

    <aside class="rail" id="rightRail" aria-label="博客辅助信息"></aside>
  </div>
  <nav class="mobile-nav" aria-label="移动端导航">
    <a href="index.html" aria-label="首页" title="首页" aria-current="page">⌂<span class="nav-label visually-hidden">首页</span></a>
    <a href="search.html" aria-label="搜索" title="搜索">⌕<span class="nav-label visually-hidden">搜索</span></a>
    <a href="archive.html" aria-label="归档" title="归档">◷<span class="nav-label visually-hidden">归档</span></a>
    <a href="tags.html" aria-label="标签" title="标签">#<span class="nav-label visually-hidden">标签</span></a>
    <a href="about.html" aria-label="关于" title="关于">i<span class="nav-label visually-hidden">关于</span></a>
  </nav>
  <script src="posts.js"></script>
  <script src="script.js"></script>
</body>
```

`search.html` 的 `main` 使用 `class="timeline page-search"`，并包含 `<label for="postSearch">搜索文章</label><input id="postSearch" type="search" autocomplete="off">` 和 `<section id="pageContent" class="post-list" aria-live="polite" aria-busy="true"></section>`；`archive.html`、`tags.html` 的 `main` 分别使用 `class="timeline page-archive"` 与 `class="timeline page-tags"`，并使用相同的 `pageContent` 容器；`about.html` 的 `main` 使用 `class="timeline page-about"`，包含静态 `<article class="about-content">`，只加载 `script.js`，不加载 `posts.js`。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_all_navigation_pages_exist_with_expected_page_type tests.test_frontend_contract.FrontendContractTests.test_homepage_is_limited_to_post_stream_and_compact_header -v
```

预期：PASS，2 个测试通过。

- [ ] **步骤 5：提交页面壳**

```bash
git add docs/index.html docs/search.html docs/archive.html docs/tags.html docs/about.html tests/test_frontend_contract.py
git commit -m "feat(博客): 拆分首页与导航页面"
```

### 任务 2：重构共享脚本并实现独立页面渲染

**文件：**
- 修改：`docs/script.js`
- 修改：`tests/test_frontend_contract.py`

- [ ] **步骤 1：编写共享数据函数和页面初始化的失败测试**

在 `tests/test_frontend_contract.py` 中添加脚本契约：

```python
def test_script_has_page_initializers_and_query_safe_helpers(self):
    for snippet in (
        "function initHomePage()",
        "function initSearchPage()",
        "function initArchivePage()",
        "function initTagsPage()",
        "function initAboutPage()",
        "function getSelectedQuery(name)",
        "function groupPostsByMonth(posts)",
        "function getTagCounts(posts)",
        "encodeURIComponent(tag)",
        'localStorage.setItem("blog-theme"',
        'document.body.dataset.page',
    ):
        self.assertIn(snippet, self.script)


def test_script_does_not_reintroduce_home_only_panels(self):
    for forbidden in ("topic-tabs", "renderTopicTabs"):
        self.assertNotIn(forbidden, self.script)
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_script_has_page_initializers_and_query_safe_helpers tests.test_frontend_contract.FrontendContractTests.test_script_does_not_reintroduce_home_only_panels -v
```

预期：FAIL，旧脚本缺少页面初始化函数，仍包含首页搜索或主题栏目逻辑。

- [ ] **步骤 3：实现共享工具与页面初始化**

将 `docs/script.js` 改为按 `data-page` 分派。保留并复用 HTML 转义、复制链接、提示条与主题逻辑；使用下面的核心签名：

```javascript
function getSelectedQuery(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function getTagCounts(posts) {
  return posts
    .flatMap((post) => post.tags || [])
    .reduce((counts, tag) => counts.set(tag, (counts.get(tag) || 0) + 1), new Map());
}

function groupPostsByMonth(posts) {
  return posts.reduce((groups, post) => {
    const month = post.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), post]);
    return groups;
  }, new Map());
}

function tagUrl(tag) {
  return `tags.html?tag=${encodeURIComponent(tag)}`;
}

function archiveUrl(month) {
  return `archive.html?month=${encodeURIComponent(month)}`;
}
```

实现 `initHomePage`：按日期渲染全部文章并调用 `renderRightRail(posts)`；右栏仅渲染关于、最多 5 篇最近文章、最多 8 个标签链接及最多 6 个月归档链接。

实现 `initSearchPage`：绑定 `#postSearch`，输入时用标题、摘要和标签过滤；空查询显示最近文章；无结果渲染带清除按钮的 `empty-state`。

实现 `initArchivePage`：读取 `month` 查询参数，按月分组、倒序渲染语义列表；未知月份显示空状态及 `archive.html` 清除链接。

实现 `initTagsPage`：渲染按数量倒序、名称升序的标签链接；读取 `tag` 查询参数，渲染匹配文章或带 `tags.html` 清除链接的空状态。

实现分派器：

```javascript
document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();
  bindThemeButtons();
  const page = document.body.dataset.page;
  const initializers = {
    home: initHomePage,
    search: initSearchPage,
    archive: initArchivePage,
    tags: initTagsPage,
    about: initAboutPage,
  };
  initializers[page]?.();
});
```

`initAboutPage` 只设置主题和导航状态，不读取 `posts`。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --check docs/script.js
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract -v
```

预期：JavaScript 语法检查无输出；前端契约测试通过。

- [ ] **步骤 5：提交共享页面逻辑**

```bash
git add docs/script.js tests/test_frontend_contract.py
git commit -m "feat(博客): 实现独立页面内容渲染"
```

### 任务 3：更新多页面响应式样式与纯图标移动导航

**文件：**
- 修改：`docs/styles.css`
- 修改：`tests/test_frontend_contract.py`

- [ ] **步骤 1：编写样式失败测试**

在 `tests/test_frontend_contract.py` 中新增：

```python
def test_styles_support_page_variants_and_icon_only_mobile_navigation(self):
    for snippet in (
        ".visually-hidden",
        ".page-search",
        ".page-archive",
        ".page-tags",
        ".about-content",
        ".mobile-nav a",
        "min-width: 44px",
        "min-height: 44px",
        "@media (max-width: 760px)",
        "padding-bottom: calc(64px + env(safe-area-inset-bottom))",
    ):
        self.assertIn(snippet, self.styles)
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_styles_support_page_variants_and_icon_only_mobile_navigation -v
```

预期：FAIL，旧 CSS 不包含多页面类、纯图标移动导航或移动安全区预留。

- [ ] **步骤 3：添加最小样式规则**

在 `docs/styles.css` 中增加页面类、可访问文字隐藏和移动底栏规则：

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.page-search,
.page-archive,
.page-tags,
.about-content {
  min-height: 12rem;
}

@media (max-width: 760px) {
  .sidebar,
  .rail { display: none; }

  .app-shell { display: block; }

  .timeline {
    border-right: 0;
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }

  .mobile-nav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(5, minmax(44px, 1fr));
    min-height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--bg);
    border-top: 1px solid var(--line);
  }

  .mobile-nav a {
    display: grid;
    min-width: 44px;
    min-height: 44px;
    place-items: center;
    color: var(--muted);
    font-size: 1.35rem;
    text-decoration: none;
  }

  .mobile-nav a[aria-current="page"] { color: var(--text); }
}
```

保持桌面 `>= 1180px` 三栏、`760px` 至 `1179px` 双栏、窄屏单栏；删除旧首页专用搜索面板、主题栏目和文字型移动导航规则。新增搜索输入、归档分组、标签统计、结果数量和关于内容的细分隔线样式，不引入渐变或大圆角。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract -v
git diff --check
```

预期：前端契约测试通过；格式检查无输出。

- [ ] **步骤 5：提交多页面样式**

```bash
git add docs/styles.css tests/test_frontend_contract.py
git commit -m "style(博客): 调整多页面导航布局"
```

### 任务 4：扩展真实浏览器交互与截图基线

**文件：**
- 修改：`tests/visual.spec.mjs`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`
- 创建：`tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`
- 创建：`tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`

- [ ] **步骤 1：编写多页面浏览器测试**

将 `tests/visual.spec.mjs` 改为页面级访问，不再只在 `beforeEach` 打开首页。新增以下测试：

```javascript
test("desktop home shows a compact header and three columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:8000/docs/index.html", { waitUntil: "networkidle" });
  await expect(page.locator(".timeline-header")).toContainText("YuCheng 的博客");
  await expect(page.locator(".timeline-header")).not.toContainText("个人技术笔记");
  await expect(page.locator(".rail")).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveScreenshot("desktop-home.png", { maxDiffPixelRatio: 0.01 });
});

test("mobile home navigation is icon-only", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8000/docs/index.html", { waitUntil: "networkidle" });
  await expect(page.locator(".mobile-nav a")).toHaveCount(5);
  await expect(page.locator(".mobile-nav .nav-label")).toHaveCSS("position", "absolute");
  await expect(page.locator(".app-shell")).toHaveScreenshot("mobile-home.png", { maxDiffPixelRatio: 0.01 });
});

test("mobile search filters an article", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8000/docs/search.html", { waitUntil: "networkidle" });
  await page.locator("#postSearch").fill("Markdown");
  await expect(page.locator(".post-item")).toHaveCount(1);
  await expect(page.locator(".app-shell")).toHaveScreenshot("mobile-search-results.png", { maxDiffPixelRatio: 0.01 });
});

test("mobile tags page honors an encoded tag query", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8000/docs/tags.html?tag=Web%20%E5%BC%80%E5%8F%91", { waitUntil: "networkidle" });
  await expect(page.locator(".post-item")).toHaveCount(1);
  await expect(page.locator(".app-shell")).toHaveScreenshot("mobile-tags-filtered.png", { maxDiffPixelRatio: 0.01 });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
npm run test:visual
```

预期：FAIL，独立页面尚不存在或新选择器/截图基线缺失。

- [ ] **步骤 3：生成截图基线**

使用系统 Chromium（由 `playwright.config.mjs` 默认配置）更新快照：

```bash
npx playwright test --config=playwright.config.mjs --update-snapshots
```

预期：创建或更新 `desktop-home-linux.png`、`mobile-home-linux.png`、`mobile-search-results-linux.png` 和 `mobile-tags-filtered-linux.png`。

- [ ] **步骤 4：正常模式复跑视觉测试**

运行：

```bash
npm run test:visual
```

预期：所有视觉用例 PASS，截图比较无差异。

- [ ] **步骤 5：提交视觉门禁**

```bash
git add tests/visual.spec.mjs tests/visual.spec.mjs-snapshots
git commit -m "test(博客): 覆盖多页面视觉回归"
```

### 任务 5：执行分支级验收与准备集成

**文件：**
- 修改：`docs/superpowers/specs/2026-07-22-multipage-navigation-design.md`

- [ ] **步骤 1：更新规格实施状态**

在规格目标后添加：

```markdown
## 实施状态

- [x] 设计已获批准并进入实施。
- [x] 多页面导航、响应式样式和视觉门禁已完成分支级验证。
```

- [ ] **步骤 2：运行完整测试与构建验证**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest discover -s tests -v
npm run test:visual
/tmp/yucheng-blog-venv/bin/python -m py_compile scripts/build.py
/tmp/yucheng-blog-venv/bin/python scripts/build.py
before=$(git status --porcelain -- docs/posts.js docs/posts)
/tmp/yucheng-blog-venv/bin/python scripts/build.py
after=$(git status --porcelain -- docs/posts.js docs/posts)
test "$before" = "$after"
git diff --check
```

预期：所有 Python 与 Playwright 测试通过；编译成功；两次构建不修改生成文章与索引文件；格式检查无输出。

- [ ] **步骤 3：审查受保护路径与工作区状态**

运行：

```bash
git diff --name-only main...HEAD
git status --short
```

预期：变更仅包含 `docs/*.html`、`docs/script.js`、`docs/styles.css`、前端测试、视觉截图与规格文档；不包含 `posts/`、`scripts/build.py`、`templates/post-template.html`、`docs/posts.js`、`docs/posts/` 或 `.github/workflows/`。

- [ ] **步骤 4：提交最终规格状态**

```bash
git add docs/superpowers/specs/2026-07-22-multipage-navigation-design.md
git commit -m "docs(博客): 标记多页面导航完成"
```

- [ ] **步骤 5：进入集成收尾**

运行：

```bash
git log --oneline main..HEAD
git status --short
```

预期：列出本功能分支的任务提交，工作区干净。随后使用 `finishing-a-development-branch` 的本地合并、PR、保留或丢弃选项收尾。