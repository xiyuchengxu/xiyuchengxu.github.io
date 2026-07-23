# 移动底部导航图标设计

## 目标

替换博客移动底部导航中由文本符号渲染的 `⌂ / ⌕ / ◷ / # / i`。新图标应具有接近 X 信息流产品的饱满视觉重心和紧凑密度：未选中项保持统一线框，当前页以更饱满的填充状态强调。改动不复制 X 的商标、图形资产或文案。

## 范围

本次变更只调整五个静态导航页面的导航标记、共享移动导航样式和对应测试资产。

- 保留：五个页面的 URL、`aria-label`、`title`、`aria-current`、桌面侧栏文字、顶部主题按钮、文章构建器、Markdown 内容和 GitHub Actions。
- 新增：本地 `docs/icons.svg` 图标精灵，包含来自 Lucide 图标集的静态 SVG 符号。
- 修改：`docs/index.html`、`docs/search.html`、`docs/archive.html`、`docs/tags.html`、`docs/about.html`、`docs/styles.css`、前端契约和 Playwright 截图基线。
- 不包含：外部图标 CDN、前端图标运行时、主题切换行为调整、导航目标变更、导航文字在移动端重新可见或其他页面布局重构。

## 图标系统

### 图标映射

| 目标页 | 文件 | Lucide 符号 | 可访问名称 |
|---|---|---|---|
| 首页 | `index.html` | `House` | `首页` |
| 搜索 | `search.html` | `Search` | `搜索` |
| 归档 | `archive.html` | `Clock3` | `归档` |
| 标签 | `tags.html` | `Hash` | `标签` |
| 关于 | `about.html` | `CircleInfo` | `关于` |

`docs/icons.svg` 使用 `<symbol>` 定义上述图标。每个导航链接以 `<svg class="nav-icon" aria-hidden="true"><use href="icons.svg#..."></use></svg>` 引用本地精灵；链接自身继续提供中文 `aria-label`、`title` 和视觉隐藏文本，因此图标不承担可访问名称。

桌面侧栏和移动底栏使用同一组图标，避免不同视口出现不一致的字形。桌面侧栏仍显示文字标签；移动底栏仍只显示图标。

### 视觉状态

- 未选中导航图标：`28 px × 28 px`，`2.5 px` 等效线宽，`stroke: currentColor`，颜色使用 `--muted`。
- 当前页图标：保持同一 `28 px` 外框，但使用 `--text`，并对可填充路径使用 `fill: currentColor`，形成更饱满的当前页重心。
- 当前页不使用大圆形、胶囊或卡片背景；状态由图标本身、颜色和填充表达。
- 悬停和键盘焦点不改变图标尺寸，避免布局跳动；焦点继续使用全局 `:focus-visible` 轮廓。
- 顶部主题切换按钮不在本次改动范围内，继续使用现有实现。

## 移动底栏布局

在窄屏断点（`max-width: 760px`）下：

- 外层 `.mobile-nav` 保持固定于视口底部、全宽、顶部细分隔线和安全区底部内边距。
- 在导航内部增加一个仅承载五个链接的紧凑网格容器。该容器使用 5 个 `48 px` 列、`12 px` 列间距并水平居中，总宽度为 `288 px`。
- 每个链接保持最小 `48 px × 48 px` 命中区，图标本身居中，满足触控和键盘使用要求。
- 页面内容继续预留底部导航和安全区高度，文章操作、搜索结果与空状态不得被遮挡。
- 宽屏和中屏不显示移动底栏；桌面侧栏仍保持图标加文字的导航形式。

该布局比当前 `justify-content: space-around` 更紧凑。导航栏背景仍可全宽延展，实际图标组则保持稳定宽度，避免大屏或高密度屏幕上出现过大的视觉间隔。

## 可访问性与降级

- 每个导航链接持续具有中文 `aria-label` 和 `title`；当前页持续具有 `aria-current="page"`。
- 图标 SVG 一律使用 `aria-hidden="true"`，避免屏幕阅读器重复朗读图标与链接名称。
- `.visually-hidden` 文本继续保留在移动导航链接中。
- 本地图标精灵不可用时，链接仍保留可访问名称和 48 px 命中区域；不得退回显示文本符号字形。
- 深色与浅色主题均使用现有 `--text`、`--muted` 和 `--focus` 颜色变量，保证主题切换后图标状态同步更新。

## 验收与测试

### 静态契约

- `docs/icons.svg` 存在，并定义 5 个本地 Lucide SVG 符号。
- 五个导航页面的桌面侧栏和移动底栏均不再包含 `⌂`、`⌕`、`◷`、`#` 或裸 `i` 图标文本。
- 五个页面的移动链接均引用本地 `icons.svg#...`，包含 `.nav-icon`、`aria-hidden="true"`、原有 `aria-label`、`title` 和当前页语义。
- CSS 包含 `28 px` 图标尺寸、`48 px` 命中区、紧凑五列网格和当前页填充状态；不恢复当前页的大圆形背景。

### 浏览器验证

- 移动首页、搜索页和标签页截图均显示五个清晰且大小一致的图标，底栏不显示文字。
- 当前页图标比未选中项视觉更饱满，但不出现大圆形或胶囊背景。
- 桌面首页截图显示图标加文字的左侧导航，且不影响三栏信息架构。
- 运行 Playwright 像素比较，更新受本次图标变化影响的基线后以正常模式复跑。

### 发布验证

- 运行完整 Python 前端/构建测试、Playwright 截图测试、Python 编译、双次构建幂等和 `git diff --check`。
- 确认变更不影响 `posts/*.md`、`scripts/build.py`、`templates/post-template.html`、`docs/posts.js`、`docs/posts/` 和 `.github/workflows/build-posts.yml`。
- 合并后再推送 `main`，并核验 GitHub 远程提交与公开 Pages 的五个导航页面。