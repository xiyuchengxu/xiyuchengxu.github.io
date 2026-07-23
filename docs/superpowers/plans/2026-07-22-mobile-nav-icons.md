# 移动导航图标实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将五个博客页面的文本符号导航替换为本地 Lucide SVG 图标精灵，并将移动端底栏收紧为 X 式高密度、当前页更饱满的纯图标导航。

**架构：** 新建 `docs\/icons.svg` 作为静态 SVG 精灵，五份页面的桌面侧栏和移动底栏都通过 `<use href="icons.svg#icon-home">` 等精确符号 ID 引用同一组图标。CSS 只负责尺寸、颜色、紧凑网格与当前页视觉状态；文章数据、页面路由和主题逻辑保持不变。

**技术栈：** 静态 HTML、CSS、原生 JavaScript、Python `unittest`、Playwright、系统 Chromium。

---

## 文件结构

- 创建：`docs/icons.svg`
  - 定义 `icon-home`、`icon-search`、`icon-archive`、`icon-tags`、`icon-about` 以及对应的 `*-active` 变体；所有图标使用本地 Lucide 风格 24 × 24 SVG 路径。
- 修改：`docs/index.html`
  - 将首页桌面侧栏和移动底栏中的五个文本图标替换为 SVG 精灵引用；首页入口使用 `icon-home-active`。
- 修改：`docs/search.html`
  - 将两组导航替换为 SVG；搜索入口使用 `icon-search-active`。
- 修改：`docs/archive.html`
  - 将两组导航替换为 SVG；归档入口使用 `icon-archive-active`。
- 修改：`docs/tags.html`
  - 将两组导航替换为 SVG；标签入口使用 `icon-tags-active`。
- 修改：`docs/about.html`
  - 将两组导航替换为 SVG；关于入口使用 `icon-about-active`。
- 修改：`docs/styles.css`
  - 定义 `.nav-icon`、桌面导航图标规则、移动端 `288 px` 紧凑五列容器、`48 px` 命中区和当前页填充状态；移除移动端 `space-around` 和圆形选中背景。
- 修改：`tests/test_frontend_contract.py`
  - 固定图标精灵、五页 SVG 引用、可访问名称和移动布局的静态契约。
- 修改：`tests/visual.spec.mjs`
  - 固定桌面和移动底栏的 SVG 数量、当前页状态与无文字渲染约束。
- 修改：`tests/visual.spec.mjs-snapshots/desktop-home-linux.png`
  - 更新桌面首页基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`
  - 更新移动首页基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`
  - 更新移动搜索页基线。
- 修改：`tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`
  - 更新移动标签页基线。

## 全局约束

- 不引入 CDN、前端图标库运行时、字体图标或外部图片资源。
- 保留每个链接的 `href`、中文 `aria-label`、`title`、当前页 `aria-current="page"` 与 `.nav-label.visually-hidden` 文本。
- 所有 `.nav-icon` 必须有 `aria-hidden="true"`；SVG 不提供独立可访问名称。
- 移动端只显示图标，桌面侧栏显示图标和文字。
- 不修改 `posts/*.md`、`scripts/build.py`、`templates/post-template.html`、`docs/posts.js`、`docs/posts/` 或 `.github/workflows/build-posts.yml`。
- 使用 `/tmp/yucheng-blog-venv/bin/python` 运行 Python 测试和构建命令。
- 使用系统 Chromium 的 Playwright 配置，不改变 `playwright.config.mjs`。

### 任务 1：固定 SVG 导航契约

**文件：**
- 修改：`tests/test_frontend_contract.py`

- [ ] **步骤 1：编写失败的图标精灵与导航契约**

在 `FrontendContractTests` 中添加以下测试和辅助映射：

```python
    def test_navigation_uses_local_svg_icons_with_accessible_links(self):
        icon_ids = {
            "index.html": "icon-home",
            "search.html": "icon-search",
            "archive.html": "icon-archive",
            "tags.html": "icon-tags",
            "about.html": "icon-about",
        }
        sprite = Path("docs/icons.svg").read_text(encoding="utf-8")

        for icon_id in icon_ids.values():
            self.assertIn(f'id="{icon_id}"', sprite)
            self.assertIn(f'id="{icon_id}-active"', sprite)

        for filename, active_icon_id in icon_ids.items():
            html = Path("docs", filename).read_text(encoding="utf-8")
            self.assertEqual(html.count('class="nav-icon" aria-hidden="true"'), 10)
            self.assertIn('class="mobile-nav-links"', html)
            self.assertIn(f'href="icons.svg#{active_icon_id}-active"', html)
            for legacy_text_node in (">⌂<", ">⌕<", ">◷<", ">#<", ">i<"):
                self.assertNotIn(legacy_text_node, html)
```

同时添加 CSS 契约：

```python
    def test_styles_define_compact_svg_mobile_navigation(self):
        for snippet in (
            ".nav-icon",
            "width: 28px",
            "height: 28px",
            "stroke-width: 2.5",
            "grid-template-columns: repeat(5, 48px)",
            "width: 288px",
            "min-width: 48px",
            "min-height: 48px",
        ):
            self.assertIn(snippet, self.styles)
        self.assertNotIn("justify-content: space-around", self.styles)
        self.assertNotIn("background: var(--surface-hover);", self.styles.split("@media (max-width: 760px)", 1)[1])
```

- [ ] **步骤 2：运行测试确认红灯**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract.FrontendContractTests.test_navigation_uses_local_svg_icons_with_accessible_links tests.test_frontend_contract.FrontendContractTests.test_styles_define_compact_svg_mobile_navigation -v
```

预期：FAIL，首先报 `docs/icons.svg` 不存在；当前页面仍包含文本符号，CSS 仍含 `justify-content: space-around`。

- [ ] **步骤 3：创建最小本地图标精灵**

创建 `docs/icons.svg`。使用 `viewBox="0 0 24 24"`、`fill="none"`、`stroke="currentColor"`、`stroke-linecap="round"` 和 `stroke-linejoin="round"` 的 SVG 根元素。定义以下符号：

```xml
<symbol id="icon-home" viewBox="0 0 24 24">
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
  <path d="M9 22V12h6v10"/>
</symbol>
<symbol id="icon-search" viewBox="0 0 24 24">
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
</symbol>
<symbol id="icon-archive" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4.5 2.5"/>
</symbol>
<symbol id="icon-tags" viewBox="0 0 24 24">
  <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>
</symbol>
<symbol id="icon-about" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 16v-4M12 8h.01"/>
</symbol>
```

为每个 `icon-<name>` 定义一个 `icon-<name>-active` 变体。活动变体不增加外部背景，而是在图标自己的可填充主体上使用低透明度填充，并保留同色轮廓。例如：

```xml
<symbol id="icon-home-active" viewBox="0 0 24 24">
  <path fill="currentColor" opacity=".24" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
  <path d="M9 22V12h6v10"/>
</symbol>
<symbol id="icon-search-active" viewBox="0 0 24 24">
  <circle cx="11" cy="11" r="8" fill="currentColor" opacity=".24"/>
  <circle cx="11" cy="11" r="8"/>
  <path d="m21 21-4.3-4.3"/>
</symbol>
<symbol id="icon-archive-active" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".24"/>
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4.5 2.5"/>
</symbol>
<symbol id="icon-tags-active" viewBox="0 0 24 24">
  <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" stroke-width="3.2"/>
</symbol>
<symbol id="icon-about-active" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".24"/>
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 16v-4M12 8h.01"/>
</symbol>
```

不要添加圆形或胶囊背景；这里的填充位于现有图标轮廓内，而非图标外层容器。

- [ ] **步骤 4：将五页导航替换为 SVG 精灵引用**

将每个桌面侧栏链接改为图标 SVG + 原有文字。首页桌面入口示例：

```html
<a class="nav-link is-active" href="index.html" aria-current="page">
  <svg class="nav-icon" aria-hidden="true"><use href="icons.svg#icon-home-active"></use></svg>
  <span>首页</span>
</a>
```

移动入口保留视觉隐藏文字。首页移动入口示例：

```html
<nav class="mobile-nav" aria-label="移动端导航">
  <div class="mobile-nav-links">
    <a href="index.html" aria-label="首页" title="首页" aria-current="page"><svg class="nav-icon" aria-hidden="true"><use href="icons.svg#icon-home-active"><\/use><\/svg><span class="nav-label visually-hidden">首页<\/span><\/a>
    <a href="search.html" aria-label="搜索" title="搜索"><svg class="nav-icon" aria-hidden="true"><use href="icons.svg#icon-search"><\/use><\/svg><span class="nav-label visually-hidden">搜索<\/span><\/a>
    <a href="archive.html" aria-label="归档" title="归档"><svg class="nav-icon" aria-hidden="true"><use href="icons.svg#icon-archive"><\/use><\/svg><span class="nav-label visually-hidden">归档<\/span><\/a>
    <a href="tags.html" aria-label="标签" title="标签"><svg class="nav-icon" aria-hidden="true"><use href="icons.svg#icon-tags"><\/use><\/svg><span class="nav-label visually-hidden">标签<\/span><\/a>
    <a href="about.html" aria-label="关于" title="关于"><svg class="nav-icon" aria-hidden="true"><use href="icons.svg#icon-about"><\/use><\/svg><span class="nav-label visually-hidden">关于<\/span><\/a>
  <\/div>
<\/nav>
```

活动图标映射固定为：`index.html` 使用 `icon-home-active`，`search.html` 使用 `icon-search-active`，`archive.html` 使用 `icon-archive-active`，`tags.html` 使用 `icon-tags-active`，`about.html` 使用 `icon-about-active`。每页其余四个导航链接使用上述对应基础图标 ID，不携带 `-active` 后缀。

- [ ] **步骤 5：实现紧凑移动布局与桌面图标规则**

在 `docs\/styles.css` 中替换现有 `.nav-link` 图标、`.mobile-nav` 和 `.mobile-nav a` 相关规则，并加入以下规则：

```css
.nav-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  color: currentColor;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
}

.nav-link .nav-icon { color: var(--muted); }
.nav-link[aria-current="page"] .nav-icon { color: var(--text); }

@media (max-width: 760px) {
  .mobile-nav {
    position: fixed;
    inset: auto 0 0;
    z-index: 20;
    display: flex;
    min-height: calc(64px + env(safe-area-inset-bottom));
    justify-content: center;
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--bg);
    border-top: 1px solid var(--line);
  }

  .mobile-nav-links {
    display: grid;
    grid-template-columns: repeat(5, 48px);
    width: 288px;
    column-gap: 12px;
  }

  .mobile-nav a {
    display: grid;
    min-width: 48px;
    min-height: 48px;
    place-items: center;
    color: var(--muted);
    background: transparent;
    border-radius: 0;
  }

  .mobile-nav a[aria-current="page"] { color: var(--text); }
}
```

Keep the outer `.mobile-nav` fixed and full-width. Move the five links into `.mobile-nav-links` on all five pages; the wrapper is required so the full-width background and fixed `288 px` icon grid do not conflict.

- [ ] **步骤 6：运行测试确认绿灯**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest tests.test_frontend_contract -v
node --check docs/script.js
git diff --check
```

预期：所有前端契约通过，JavaScript 语法检查无输出，格式检查无输出。

- [ ] **步骤 7：提交静态图标实现**

运行：

```bash
git add docs/icons.svg docs/index.html docs/search.html docs/archive.html docs/tags.html docs/about.html docs/styles.css tests/test_frontend_contract.py
git commit -m "feat(博客): 更换移动导航图标"
```

预期：产生一个仅包含图标精灵、五页导航标记、样式和静态契约的提交。

### 任务 2：更新浏览器视觉门禁

**文件：**
- 修改：`tests/visual.spec.mjs`
- 修改：`tests/visual.spec.mjs-snapshots/desktop-home-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-home-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`
- 修改：`tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`

- [ ] **步骤 1：扩展失败的视觉断言**

在四个 Playwright 用例中添加图标与状态断言。移动首页示例：

```javascript
await expect(page.locator(".mobile-nav .nav-icon")).toHaveCount(5);
await expect(page.locator(".mobile-nav a[aria-current='page'] .nav-icon")).toHaveCount(1);
await expect(page.locator(".mobile-nav .nav-label")).toHaveCount(5);
await expect(page.locator(".mobile-nav a").first()).toHaveCSS("min-width", "48px");
```

桌面首页追加：

```javascript
await expect(page.locator(".sidebar-nav .nav-icon")).toHaveCount(5);
await expect(page.locator(".sidebar-nav .nav-link span")).toHaveCount(5);
```

- [ ] **步骤 2：运行截图测试确认红灯**

运行：

```bash
npm run test:visual
```

预期：现有四张快照因导航图标与布局变化而发生像素差异失败；DOM 断言应通过。

- [ ] **步骤 3：更新截图基线**

运行：

```bash
npm run test:visual -- --update-snapshots
```

预期：4 个浏览器用例通过，并更新四张 `*-linux.png` 基线。

- [ ] **步骤 4：正常模式复跑视觉测试**

运行：

```bash
npm run test:visual
```

预期：4 个浏览器用例通过，证明新基线可重复比较。

- [ ] **步骤 5：提交视觉门禁资产**

运行：

```bash
rm -rf test-results
git add tests/visual.spec.mjs tests/visual.spec.mjs-snapshots/desktop-home-linux.png tests/visual.spec.mjs-snapshots/mobile-home-linux.png tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png
git commit -m "test(博客): 更新导航图标视觉基线"
```

预期：产生一个仅包含视觉断言和四张截图基线的提交。

### 任务 3：最终集成验证

**文件：**
- 修改：`docs/superpowers/specs/2026-07-22-mobile-nav-icons-design.md`
- 修改：`.superpowers/sdd/progress.md`（Git 本地排除，不提交）

- [ ] **步骤 1：标记规格实施完成**

在规格末尾新增：

```markdown
## 实施状态

- [x] 规格已批准并实施。
- [x] 静态契约、系统 Chromium 截图比较、构建与幂等检查已通过。
```

- [ ] **步骤 2：运行完整验证**

运行：

```bash
/tmp/yucheng-blog-venv/bin/python -m unittest discover -s tests -v
npm run test:visual
/tmp/yucheng-blog-venv/bin/python -m py_compile scripts/build.py
rm -rf /tmp/mobile-nav-icons-build-one /tmp/mobile-nav-icons-build-two
/tmp/yucheng-blog-venv/bin/python scripts/build.py --posts-dir posts --output-dir /tmp/mobile-nav-icons-build-one
/tmp/yucheng-blog-venv/bin/python scripts/build.py --posts-dir posts --output-dir /tmp/mobile-nav-icons-build-two
diff -ru /tmp/mobile-nav-icons-build-one /tmp/mobile-nav-icons-build-two
git diff --check main...HEAD
git diff --name-only main...HEAD
```

预期：Python 测试全绿，4 个 Playwright 用例通过，编译无输出，两次构建差异为空，格式检查无输出；文件清单不包含受保护的 Markdown、构建、生成物和 Actions 路径。

- [ ] **步骤 3：提交规格状态**

运行：

```bash
git add docs/superpowers/specs/2026-07-22-mobile-nav-icons-design.md
git commit -m "docs(博客): 标记导航图标改造完成"
```

预期：产生一个仅包含规格实施状态的提交。

- [ ] **步骤 4：记录账本并检查分支状态**

运行：

```bash
mkdir -p .superpowers/sdd
printf '%s\n' 'Task 1: complete (static SVG contract and implementation)' 'Task 2: complete (Playwright icon baselines)' 'Task 3: complete (full verification)' > .superpowers/sdd/progress.md
git status --short
git log --oneline main..HEAD
```

预期：`git status --short` 无输出（账本由本地 Git exclude 忽略）；日志只显示本功能分支的 3 个实现提交和起始规格/计划提交。