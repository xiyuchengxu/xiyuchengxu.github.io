# 文章预览 Tweet Cell 与互动图标栏实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将首页、搜索结果和标签筛选结果的共享文章预览改为 X 风格的两列 Tweet Cell：头像下方留空，正文与四个图标动作全部位于右侧内容列；仅保留转发图标的复制链接行为，并为未来真实互动数据保留 DOM 挂点。

**架构：** `docs/script.js` 的 `postMarkup()` 生成语义化的头像列和内容列，并用现有的 `post.id` 作为经过转义的 `data-post-id`。`docs/icons.svg` 提供四个本地线框图标，`docs/styles.css` 用 Grid 强制内容永远停留在头像右侧。Python 静态契约验证结构和无后端约束，Playwright 验证 320px 几何、禁用状态、复制链接和四个页面截图基线。

**技术栈：** 静态 HTML、CSS、原生 JavaScript、本地 SVG 精灵、Python `unittest`、Node.js、Playwright、系统 Chromium。

---

## 文件结构

- 修改：`docs/script.js:45-62,137-141`
  - 重构 `postMarkup()` 为头像列和内容列；输出可访问的评论、转发、爱心、阅读量图标位；仅监听 `data-post-action="repost"` 的复制事件。
- 修改：`docs/styles.css:107,231-320`
  - 用两列 Grid 固定文章预览的头像列和内容列；用四等分 Grid 布局操作区；从通用控件选择器和文章操作区移除旧文字操作样式。
- 修改：`docs/icons.svg:2-43`
  - 增加评论、转发、爱心、阅读量四个本地 `symbol`。
- 修改：`tests/test_frontend_contract.py:84-210`
  - 将旧文字操作契约替换为 Tweet Cell、SVG、数据挂点和无伪造互动数据的静态契约；增加 CSS Grid 契约。
- 修改：`tests/visual.spec.mjs:1-144`
  - 增加 Tweet Cell 结构、头像列留白、320px 操作区几何、禁用状态和转发复制链接验证；让已有截图测试调用结构断言。
- 修改：`tests/visual.spec.mjs-snapshots/desktop-home-linux.png`
  - 更新 `1440 × 1000` 首页预览流截图基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`
  - 更新 `390 × 844` 首页预览流截图基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`
  - 更新 `390 × 844` 搜索结果截图基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`
  - 更新 `390 × 844` 标签筛选截图基线。

## 全局约束

- 在 `/workspace/YuCheng_web/.worktrees/post-preview-engagement-ui` 的 `feature/post-preview-engagement-ui` 分支执行。
- 不修改 `docs/posts.js`：它由 `scripts/build.py` 生成，现有 `stats` 对象不参与本次渲染。
- 不修改文章详情页、归档页、顶部品牌栏、侧栏、移动导航、构建脚本、部署工作流或文章 Markdown。
- 本轮不新增 API、网络请求、Cookie、LocalStorage 互动状态、浏览器指纹、IP 读取、评论容器、虚构计数或“0”占位数字。
- 评论、爱心必须是禁用控件；阅读量必须是只读指标；只有转发图标可复制链接并显示已有 Toast。
- 新增 SVG 必须使用现有精灵的 `currentColor`、`stroke-linecap="round"`、`stroke-linejoin="round"`、`stroke-width="2.5"` 和 `viewBox="0 0 24 24"` 约定。
- 远程 Playwright MCP 已通过 `initialize`、`tools/list` 和只读的 `browser_tabs(action: "list")` 调用验证可用。它可用于实现后的人工截图复核，但不修改其配置，也不取代仓库的 `npm run test:visual`；后者仍是唯一强制浏览器验证与截图基线门禁。
- 每个生产改动前先写并运行对应测试，确认它因功能缺失失败；每个任务完成后只提交该任务涉及的文件。

## 任务 1：建立可复现的测试环境并确认基线

**文件：**
- 不修改仓库文件。

- [ ] **步骤 1：安装现有 Node.js 和 Python 开发依赖**

在工作树根目录运行：

```bash
npm ci
python3 -m venv /tmp/yucheng-post-preview-venv
/tmp/yucheng-post-preview-venv/bin/pip install -r requirements.txt
```

预期：两条命令均退出 `0`；`git status --short` 没有 `package.json`、`package-lock.json`、`requirements.txt` 或其他仓库文件变更。

- [ ] **步骤 2：运行未改动时的基线测试**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover -s tests -v
PLAYWRIGHT_BROWSER=1 /tmp/yucheng-post-preview-venv/bin/python \
  -m unittest discover -s tests -p 'test_visual_regression.py' -v
node --check docs/script.js
/tmp/yucheng-post-preview-venv/bin/python scripts/build.py
git diff --check
```

预期：Python 契约与构建测试全部通过；浏览器包装测试通过；JavaScript 语法检查无输出；构建与 `git diff --check` 退出 `0`。若任一基线失败，停止实现并先记录失败原因，不能将它归因于本功能。

## 任务 2：用测试驱动语义化预览结构、图标资源和转发行为

**文件：**
- 修改：`tests/test_frontend_contract.py:84-210`
- 修改：`docs/icons.svg:2-43`
- 修改：`docs/script.js:45-62,137-141`

- [ ] **步骤 1：编写会失败的 Tweet Cell 静态契约**

在 `FrontendContractTests` 中将 `test_script_exposes_real_blog_actions_without_social_counters` 替换为以下三个测试。它们只约束 DOM、接口属性、SVG 资源和归档页边界，暂不约束 CSS：

```python
    def test_script_exposes_tweet_cell_actions_without_social_data(self):
        for snippet in (
            "const postId = escapeHtml(String(post.id));",
            '<article class="post-item" data-post-id="${postId}">',
            '<div class="post-avatar-column" aria-hidden="true">',
            '<div class="post-content">',
            'class="post-action" type="button" data-post-action="comment"',
            'class="post-action" type="button" data-post-action="repost"',
            'data-post-url="${url}"',
            'class="post-action" type="button" data-post-action="like"',
            'class="post-metric" data-engagement="views"',
            'href="icons.svg#icon-comment"',
            'href="icons.svg#icon-repost"',
            'href="icons.svg#icon-like"',
            'href="icons.svg#icon-views"',
            'event.target.closest(\'[data-post-action="repost"]\')',
            "copyPostLink(repost.dataset.postUrl || \"\")",
            "navigator.clipboard.writeText",
            "function showToast(message)",
        ):
            self.assertIn(snippet, self.script)

        self.assertGreaterEqual(self.script.count('data-post-id="${postId}"'), 4)
        for forbidden in (
            "read-action",
            "copy-action",
            "data-url=",
            "阅读文章",
            "复制链接",
            "post.stats",
            "handleLike",
            "like-count",
            "repost-btn",
            "reply-btn",
        ):
            self.assertNotIn(forbidden, self.script)

    def test_local_svg_sprite_defines_tweet_cell_icons(self):
        sprite = Path("docs/icons.svg").read_text(encoding="utf-8")
        for icon_id in ("icon-comment", "icon-repost", "icon-like", "icon-views"):
            self.assertIn(f'<symbol id="{icon_id}" viewBox="0 0 24 24">', sprite)

    def test_archive_initializer_keeps_the_compact_list(self):
        archive_initializer = self.script.split("function initArchivePage()", 1)[1].split(
            "function initTagsPage()", 1
        )[0]
        self.assertIn('<section class="archive-group">', archive_initializer)
        self.assertNotIn("postMarkup(", archive_initializer)
        self.assertNotIn("post-actions", archive_initializer)
```

- [ ] **步骤 2：运行静态契约确认红灯**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover \
  -s tests -p 'test_frontend_contract.py' -v
```

预期：FAIL；失败信息包含缺少 `const postId = escapeHtml(String(post.id));`、Tweet Cell 类名或四个 `icon-*` symbol 之一。失败必须源于当前结构仍是单列文字操作，而不是导入或环境错误。

- [ ] **步骤 3：在本地 SVG 精灵中加入四个线框图标**

在 `docs/icons.svg` 的最后一个现有 `<symbol>` 后、根 `<svg>` 结束标签前加入：

```xml
  <symbol id="icon-comment" viewBox="0 0 24 24">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.8-.9L3 21l1.8-5A8.4 8.4 0 1 1 21 11.5Z"/>
  </symbol>
  <symbol id="icon-repost" viewBox="0 0 24 24">
    <path d="m17 2 4 4-4 4"/>
    <path d="M3 11V9a3 3 0 0 1 3-3h15"/>
    <path d="m7 22-4-4 4-4"/>
    <path d="M21 13v2a3 3 0 0 1-3 3H3"/>
  </symbol>
  <symbol id="icon-like" viewBox="0 0 24 24">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>
  </symbol>
  <symbol id="icon-views" viewBox="0 0 24 24">
    <path d="M3 3v18h18"/>
    <path d="M7 16v-5"/>
    <path d="M12 16V7"/>
    <path d="M17 16v-9"/>
  </symbol>
```

保留根 `<svg>` 的共同 stroke 属性，不为单个 symbol 添加填充色、渐变或外部资源。

- [ ] **步骤 4：重构 `postMarkup()` 为头像列和内容列**

在 `docs/script.js` 中保留现有的 `tags`、`title`、`summary`、`url`、`date`、作者字段转义，并在它们之后声明转义后的 ID：

```javascript
  const postId = escapeHtml(String(post.id));
```

将当前 `return` 模板完全替换为：

```javascript
  return `<article class="post-item" data-post-id="${postId}">
    <div class="post-avatar-column" aria-hidden="true">
      <span class="avatar">Y</span>
    </div>
    <div class="post-content">
      <div class="post-meta">
        <strong>${authorName}</strong>
        <span>${authorHandle}</span>
        <span aria-hidden="true">·</span>
        <time datetime="${date}">${date}</time>
      </div>
      <a class="post-link" href="${url}">
        <h2>${title}</h2>
        <p>${summary}</p>
      </a>
      <div class="post-tags">${tags}</div>
      <div class="post-actions" aria-label="文章互动">
        <button class="post-action" type="button" data-post-action="comment" data-post-id="${postId}" disabled aria-label="评论功能暂未开放" title="评论功能暂未开放">
          <svg aria-hidden="true"><use href="icons.svg#icon-comment"></use></svg>
        </button>
        <button class="post-action" type="button" data-post-action="repost" data-post-id="${postId}" data-post-url="${url}" aria-label="转发并复制链接" title="转发并复制链接">
          <svg aria-hidden="true"><use href="icons.svg#icon-repost"></use></svg>
        </button>
        <button class="post-action" type="button" data-post-action="like" data-post-id="${postId}" disabled aria-label="点赞功能暂未开放" title="点赞功能暂未开放">
          <svg aria-hidden="true"><use href="icons.svg#icon-like"></use></svg>
        </button>
        <span class="post-metric" data-engagement="views" data-post-id="${postId}" role="img" aria-label="阅读量暂未统计" title="阅读量暂未统计">
          <svg aria-hidden="true"><use href="icons.svg#icon-views"></use></svg>
        </span>
      </div>
    </div>
  </article>`;
```

不要把动作控件嵌套进 `.post-link`，不要从 `post.stats` 读取任何值，不要新增计数节点或后端请求。

- [ ] **步骤 5：收窄事件委托到转发按钮**

将 `bindArticleActions()` 替换为：

```javascript
function bindArticleActions() {
  document.addEventListener("click", (event) => {
    const repost = event.target.closest('[data-post-action="repost"]');
    if (repost) copyPostLink(repost.dataset.postUrl || "");
  });
}
```

保留 `copyPostLink()` 和 `showToast()` 原样，避免将主题的 `localStorage` 与未来互动状态混为一谈。

- [ ] **步骤 6：运行静态契约确认绿灯**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover \
  -s tests -p 'test_frontend_contract.py' -v
node --check docs/script.js
```

预期：全部通过；JavaScript 语法检查无输出。此时无需运行完整视觉套件，因为两列 CSS 尚未实现。

- [ ] **步骤 7：提交语义和图标资源**

运行：

```bash
git add docs/icons.svg docs/script.js tests/test_frontend_contract.py
git commit -m "feat(文章预览): 添加互动图标结构"
```

预期：生成一个只包含 SVG、共享预览 DOM、复制事件委托和相应静态契约的提交。

## 任务 3：以测试驱动两列 Tweet Cell 布局和浏览器几何门禁

**文件：**
- 修改：`tests/test_frontend_contract.py`
- 修改：`tests/visual.spec.mjs`
- 修改：`docs/styles.css:231-320`

- [ ] **步骤 1：添加会失败的 CSS Grid 静态契约**

在 `FrontendContractTests` 中加入：

```python
    def test_styles_define_tweet_cell_grid_and_icon_action_targets(self):
        for snippet in (
            "grid-template-columns: 40px minmax(0, 1fr)",
            "column-gap: 12px",
            ".post-avatar-column",
            ".post-content",
            "grid-template-columns: repeat(4, minmax(44px, 1fr))",
            ".post-action,",
            ".post-metric",
            "min-width: 44px",
            "min-height: 44px",
            ".post-action:not(:disabled):hover",
        ):
            self.assertIn(snippet, self.styles)
        for obsolete in (".read-action", ".copy-action"):
            self.assertNotIn(obsolete, self.styles)
```

- [ ] **步骤 2：添加会失败的 Playwright Tweet Cell 几何与动作测试**

在 `tests/visual.spec.mjs` 的顶层、`expectHomeTopbarGeometry()` 后添加以下辅助函数：

```javascript
async function expectTweetCellGeometry(page) {
  const geometry = await page.locator(".post-item").first().evaluate((item) => {
    const rect = (element) => {
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
    const avatar = item.querySelector(".post-avatar-column");
    const content = item.querySelector(".post-content");
    const actions = [...item.querySelectorAll(".post-actions > *")];
    return {
      avatar: avatar && rect(avatar),
      content: content && rect(content),
      contentChildren: content ? [...content.children].map(rect) : [],
      actionBoxes: actions.map(rect),
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  expect(geometry.avatar).not.toBeNull();
  expect(geometry.content).not.toBeNull();
  expect(Math.abs((geometry.content.left - geometry.avatar.right) - 12)).toBeLessThanOrEqual(0.5);
  for (const child of geometry.contentChildren) {
    expect(child.left + 0.5).toBeGreaterThanOrEqual(geometry.content.left);
  }
  expect(geometry.actionBoxes).toHaveLength(4);
  for (const box of geometry.actionBoxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  for (let index = 1; index < geometry.actionBoxes.length; index += 1) {
    expect(geometry.actionBoxes[index - 1].right).toBeLessThanOrEqual(
      geometry.actionBoxes[index].left + 0.5,
    );
  }
  expect(geometry.hasHorizontalOverflow).toBeFalsy();
}
```

再添加独立浏览器测试：

```javascript
test("tweet cell keeps the avatar column empty and copies repost links at 320px", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:8000",
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${baseUrl}index.html`, { waitUntil: "networkidle" });

  const post = page.locator(".post-item").first();
  await expect(post).toHaveAttribute("data-post-id", "1");
  await expect(post.locator(".post-avatar-column")).toHaveCount(1);
  await expect(post.locator(".post-content")).toHaveCount(1);
  await expectTweetCellGeometry(page);

  await expect(post.getByRole("button", { name: "评论功能暂未开放" })).toBeDisabled();
  await expect(post.getByRole("button", { name: "点赞功能暂未开放" })).toBeDisabled();
  await expect(post.locator('[data-engagement="views"]')).toHaveAttribute("role", "img");

  await post.getByRole("button", { name: "转发并复制链接" }).click();
  await expect(page.locator("#toast")).toHaveText("链接已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${baseUrl}posts/2024-01-15-hello-world.html`,
  );
});
```

在现有 `desktop home shows a compact header and three columns`、`mobile home navigation is icon-only`、`mobile search filters an article` 和 `mobile tags page honors an encoded tag query` 四个测试中，在对应页面加载和现有 DOM 断言之后添加：

```javascript
  await expectTweetCellGeometry(page);
```

- [ ] **步骤 3：运行新增测试确认红灯**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover \
  -s tests -p 'test_frontend_contract.py' -v
npm run test:visual -- --grep "tweet cell keeps the avatar column"
```

预期：Python 测试因缺少 Grid CSS 片段失败；Playwright 测试因当前 `.post-content` 尚未与头像列形成 `12px` 间距或动作区未达到 `44px` 而失败。失败不能来自浏览器启动、网络或剪贴板权限。

- [ ] **步骤 4：实现两列 Grid 与四图标动作栏样式**

在 `docs/styles.css` 中保留 `.post-item, .skeleton-post` 的共同内边距和分隔线，并直接在 `.post-item:hover` 后增加：

```css
.post-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  column-gap: 12px;
  align-items: start;
}

.post-avatar-column {
  grid-column: 1;
  align-self: start;
}

.post-content {
  grid-column: 2;
  min-width: 0;
}
```

保留 `.avatar` 的 `40px` 圆形外观。保留 `.post-meta` 的弹性排版，但将其用于新的作者、handle、分隔点和日期四个同级元素。

先从文件顶部的 `.nav-link, .theme-button, .icon-button, .copy-action, ...` 通用控件选择器中移除 `.copy-action`。再用以下规则替换当前 `.post-actions`、`.read-action, .copy-action` 及其 hover 规则：

```css
.post-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(44px, 1fr));
  gap: 0;
  margin-top: .65rem;
}

.post-action,
.post-metric {
  display: grid;
  min-width: 44px;
  min-height: 44px;
  place-items: center;
  padding: 0;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: 50%;
}

.post-action { cursor: pointer; }

.post-action:disabled {
  cursor: default;
  opacity: 1;
}

.post-action svg,
.post-metric svg {
  width: 20px;
  height: 20px;
}

.post-action:not(:disabled):hover,
.post-action:not(:disabled):focus-visible {
  color: var(--accent);
  background: var(--surface-hover);
}
```

不要在移动媒体查询中缩小 `40px` 头像列、`12px` 间距、`44px` 操作区或四列数量；已有的 `.post-item { padding: .9rem; }` 移动端规则应继续生效。

- [ ] **步骤 5：运行 CSS 与几何测试确认绿灯**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover \
  -s tests -p 'test_frontend_contract.py' -v
npm run test:visual -- --grep "tweet cell keeps the avatar column"
node --check docs/script.js
```

预期：全部通过；320px 文章内容始终位于头像右侧，评论与爱心禁用，阅读量只读，转发显示「链接已复制」。

- [ ] **步骤 6：提交两列布局和浏览器几何门禁**

运行：

```bash
git add docs/styles.css tests/test_frontend_contract.py tests/visual.spec.mjs
git commit -m "feat(文章预览): 采用双列 Tweet Cell 布局"
```

预期：提交包含 Grid 布局、静态 CSS 契约和浏览器几何/复制链接测试，但不包含截图基线。

## 任务 4：更新受影响视觉基线并执行完整回归验证

**文件：**
- 修改：`tests/visual.spec.mjs-snapshots/desktop-home-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`

- [ ] **步骤 1：运行完整视觉套件确认旧基线红灯**

运行：

```bash
npm run test:visual
```

预期：几何和行为断言通过，但以下四个已有截图比较失败，因为文章预览从单列文字操作改为两列图标动作栏：

```text
desktop-home.png
mobile-home.png
mobile-search-results.png
mobile-tags-filtered.png
```

不应更新搜索或标签以外的截图；若 `home topbar stays centered` 或其他不涉及预览流的测试失败，先检查实现而不是更新无关基线。

- [ ] **步骤 2：逐个重录四个受影响截图基线**

运行以下命令，每次只更新一个测试：

```bash
npm run test:visual -- --grep "desktop home shows a compact header and three columns" --update-snapshots
npm run test:visual -- --grep "mobile home navigation is icon-only" --update-snapshots
npm run test:visual -- --grep "mobile search filters an article" --update-snapshots
npm run test:visual -- --grep "mobile tags page honors an encoded tag query" --update-snapshots
```

预期：只修改四个列出的 `tests/visual.spec.mjs-snapshots/*-linux.png` 文件。不要重录与顶部栏主题持久化有关而未含截图断言的测试。

- [ ] **步骤 3：运行完整验证并检查提交范围**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover -s tests -v
PLAYWRIGHT_BROWSER=1 /tmp/yucheng-post-preview-venv/bin/python \
  -m unittest discover -s tests -p 'test_visual_regression.py' -v
node --check docs/script.js
/tmp/yucheng-post-preview-venv/bin/python scripts/build.py
git diff --check
git status --short
```

预期：所有命令退出 `0`；完整 Python 测试中浏览器包装测试通过；工作树只显示四张截图基线待提交。若出现 `test-results/`、`playwright-report/` 或临时 venv 文件，删除这些生成物后重新检查状态。

- [ ] **步骤 4：提交视觉基线**

运行：

```bash
git add \
  tests/visual.spec.mjs-snapshots/desktop-home-linux.png \
  tests/visual.spec.mjs-snapshots/mobile-home-linux.png \
  tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png \
  tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png
git commit -m "test(文章预览): 更新互动栏视觉基线"
```

预期：提交只包含四张受影响截图基线。

- [ ] **步骤 5：在最终提交上重新验证并报告结果**

运行：

```bash
/tmp/yucheng-post-preview-venv/bin/python -m unittest discover -s tests -v
PLAYWRIGHT_BROWSER=1 /tmp/yucheng-post-preview-venv/bin/python \
  -m unittest discover -s tests -p 'test_visual_regression.py' -v
node --check docs/script.js
/tmp/yucheng-post-preview-venv/bin/python scripts/build.py
git diff --check
git status --short
git log --oneline -3
```

预期：完整测试、浏览器包装、脚本检查、构建和差异检查全部通过；`git status --short` 为空；最近三条提交按顺序包含互动图标结构、Tweet Cell 布局和视觉基线。报告 MCP 仍返回 HTTP `404`，但不将其误报为浏览器验证成功。