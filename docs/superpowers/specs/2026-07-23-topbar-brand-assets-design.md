# 首页顶部品牌栏设计

## 背景

首页顶部栏当前显示可见标题「YuCheng 的博客」和主题切换按钮。目标是参考 X App 的布局节奏，将首页顶部栏改为左侧圆形头像、中间 Logo、右侧主题切换按钮，同时保留现有站点结构和交互。

搜索、归档、标签和关于页仍需要用文字标题标明当前栏目，因此本次只修改首页。其他页面继续使用现有的「文字标题 + 主题切换按钮」顶部栏。

## 目标

- 首页顶部栏使用三列对称 Grid：左侧头像、中间 Logo、右侧主题按钮。
- Logo 相对整个顶部栏几何居中，不受左右内容宽度影响。
- 首页不再显示可见标题「YuCheng 的博客」，但保留页面标题元信息和语义标题。
- Logo 在深色和浅色主题下都有足够对比度。
- 桌面端和移动端使用同一结构，在 `320px` 宽度下不重叠、不溢出。
- 使用仓库内的本地图片资产，不依赖远程图片或第三方服务。

## 不修改的内容

- 搜索、归档、标签和关于页的顶部栏结构及可见文字标题。
- 现有主题切换 JavaScript、`blog-theme` 存储键及初始化流程。
- 桌面侧栏、右侧栏、移动底部导航和文章列表。
- 文章数据、文章详情页、Markdown 构建脚本和 GitHub Actions。

## 选定方案

首页顶部栏使用 CSS Grid，列定义为 `44px minmax(0, 1fr) 44px`。头像和主题按钮占用等宽边列，Logo 位于中列中央。这种结构能保证 Logo 始终处于顶部栏中线，并且在窄屏下仍有明确的空间边界。

未采用以下方案：

- Flex + 绝对定位：改动较少，但窄屏下更容易发生控件重叠。
- 左侧组合品牌区：实现简单，但 Logo 无法保持页面居中，不符合目标视觉。

## 资产来源与生成规则

源文件来自当前会话上传目录：

- Logo：`/data/data/com.termux/files/home/.aether/workspace/uploads/12569_8-1736929482.png`，尺寸为 `1254 × 1254px`。
- 头像：`/data/data/com.termux/files/home/.aether/workspace/uploads/6971_6-1718753706.jpg`，尺寸为 `1264 × 1264px`。

生成并提交以下站点资产：

- `docs/assets/site-logo.png`：`128 × 120px`、透明背景 PNG。
- `docs/assets/avatar.png`：`256 × 256px`、方形 PNG。

Logo 处理规则：

- 使用左上角为原点、右下边界不包含端点的裁剪框：`left=324, top=355, right=933, bottom=926`。
- 将裁剪区转为单色透明图：每个像素的 RGB 固定为白色，Alpha 取原像素 `R`、`G`、`B` 三个通道的最大值；Alpha 不大于 `8` 的背景噪点归零。该规则保留 Logo 的纹理与抗锯齿边缘，同时消除黑色背景。
- 按原比例缩放到 `128 × 120px`，不拉伸、不增加可见底色。
- 深色主题显示原始浅色 Logo；浅色主题使用 CSS `filter: brightness(0)` 显示深色 Logo。

头像处理规则：

- 使用裁剪框：`left=205, top=75, right=905, bottom=775`，得到 `700 × 700px` 方形区域。
- 将裁剪结果缩放为 `256 × 256px`，页面中以 `border-radius: 50%` 显示。
- 页面显示尺寸为 `40 × 40px`，使用 `object-fit: cover`，并增加 `1px` 的主题分隔线边框。

源文件只用于一次性生成资产。运行时和部署产物只依赖已提交的 `docs/assets/` 文件。

## 首页结构

只将 `docs/index.html` 的顶部栏改为以下语义结构：

```html
<header class="timeline-header home-topbar" aria-label="首页顶部栏">
  <a class="topbar-avatar" href="about.html" aria-label="查看关于 YuCheng">
    <img src="assets/avatar.png" alt="" width="40" height="40">
  </a>
  <h1 class="visually-hidden">YuCheng 的博客</h1>
  <a class="topbar-logo" href="index.html" aria-label="返回首页">
    <img src="assets/site-logo.png" alt="" width="128" height="120">
  </a>
  <button class="icon-button topbar-theme" type="button" data-theme-toggle aria-label="切换主题" title="切换主题">◐</button>
</header>
```

约束如下：

- 头像链接到 `about.html`，Logo 链接到 `index.html`。
- 两张图片使用空 `alt`，链接的 `aria-label` 提供唯一且不重复的可访问名称。
- `<h1>` 继续使用现有 `.visually-hidden`，供屏幕阅读器和文档结构使用，但不参与 Grid 布局。
- 页面 `<title>` 和描述元信息保持不变。
- 主题按钮保留现有 `data-theme-toggle` 属性和字符图标。

## 样式与响应式行为

- `.timeline-header` 的通用样式保持不变，避免影响其他页面。
- `.timeline-header.home-topbar` 覆盖为 Grid，使用 `grid-template-columns: 44px minmax(0, 1fr) 44px`，并移除 Flex 的 `gap` 和 `justify-content` 影响。
- `.timeline-header.home-topbar` 使用 `height: 56px`、`min-height: 56px` 和 `padding-block: 0`，保留现有水平内边距、吸顶层级、背景色和底部分隔线。组合选择器须覆盖后置的移动端 `.timeline-header` 通用规则，确保首页在所有断点均为 `56px` 高。
- `.topbar-avatar`、`.topbar-logo` 和 `.topbar-theme` 分别固定在第 `1`、`2`、`3` 列。
- 三个交互区均为 `44 × 44px`；头像图片为 `40 × 40px`，Logo 使用 `height: 32px` 和 `width: auto`，按原比例显示且宽度不超过 `44px`。
- 头像和 Logo 链接使用 Grid 居中内容，不允许图片改变列宽或顶部栏高度。
- 沿用全局 `:focus-visible` 样式；鼠标悬停时使用现有 `--surface-hover` 背景。
- 桌面端和移动端不切换结构，也不缩小头像或交互区。
- 最小支持宽度为 `320px`；页面不得产生横向滚动，三个控件的边界不得相交。

## 数据流与错误处理

页面加载时，浏览器直接读取两个本地 PNG。头像和 Logo 链接使用原生导航；主题按钮继续由现有 `script.js` 读取和写入 `localStorage.blog-theme`。本次不增加新的运行时状态或事件处理器。

不为缺失图片增加 JavaScript 兜底。资产缺失、空文件、PNG 签名错误或尺寸错误均由静态测试阻止；浏览器测试还会验证图片已完成解码且 `naturalWidth` 大于 `0`。

## 文件边界

- `docs/index.html`：替换首页顶部栏结构。
- `docs/styles.css`：增加首页专属顶部栏、头像和 Logo 样式。
- `docs/assets/site-logo.png`：新增处理后的 Logo。
- `docs/assets/avatar.png`：新增处理后的头像。
- `tests/test_frontend_contract.py`：更新首页结构和资产契约测试。
- `tests/visual.spec.mjs`：更新首页视觉与几何断言。
- `tests/visual.spec.mjs-snapshots/desktop-home-linux.png`：更新桌面首页基线。
- `tests/visual.spec.mjs-snapshots/mobile-home-linux.png`：更新移动首页基线。

`docs/script.js`、其他四个页面及其截图基线不应修改。

## 测试与验收

静态契约测试：

- 首页包含 `.home-topbar`、`.topbar-avatar`、`.topbar-logo`、`.topbar-theme` 和隐藏 `<h1>`。
- 首页不再包含可见的「YuCheng 的博客」标题。
- 头像和 Logo 链接、可访问名称、图片路径及声明尺寸正确。
- 两个 PNG 存在且非空，PNG 签名和宽高分别为 `256 × 256px`、`128 × 120px`；Logo 四角透明且至少包含一个不透明像素。
- 搜索、归档、标签和关于页不包含 `.home-topbar`，并继续显示各自的顶部栏 `<h1>`。
- 首页专属 Grid 选择器、Logo 显示尺寸和浅色主题滤镜存在，主题脚本契约保持不变。

Playwright 验证：

- 在 `1440 × 1000` 和 `390 × 844` 视口更新首页截图基线。
- 新增 `320 × 700` 窄屏几何验证，不需要新增截图基线。
- Logo 中心与 `.home-topbar` 中心的水平误差不超过 `1px`。
- 头像、Logo 和主题按钮的边界互不相交，页面无横向溢出。
- 两张图片完成加载且自然尺寸大于 `0`。
- 点击主题按钮后 `data-theme` 和 `localStorage.blog-theme` 变为 `light`，刷新后仍保持浅色主题；Logo 同时切换为深色显示。
- 运行现有搜索页和标签页视觉测试，确认旧基线无需更新。

验证命令：

```bash
python -m unittest discover -s tests -v
PLAYWRIGHT_BROWSER=1 python -m unittest discover -s tests -p 'test_visual_regression.py' -v
python -m py_compile scripts/build.py
python scripts/build.py
git diff --check
```

## 完成标准

所有静态测试、构建测试和 Playwright 测试通过；仅首页顶部栏和两张首页截图发生预期视觉变化；工作树中没有与本功能无关的文件变更。