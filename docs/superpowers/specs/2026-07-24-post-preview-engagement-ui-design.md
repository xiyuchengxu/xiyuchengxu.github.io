# 文章预览 Tweet Cell 与互动图标栏设计

## 背景

首页、搜索结果和标签筛选结果当前复用 `docs/script.js` 中的 `postMarkup()` 渲染文章预览。每个预览采用单列流布局：头像位于作者行，标题、摘要、标签和文字操作随后在整个卡片宽度内流动。摘要较长时，内容会落到头像下方，与 X App 的 Tweet Cell 结构不一致。

当前底部操作为「阅读文章」和「复制链接」两个文字控件。其中「阅读文章」重复了标题和摘要链接的语义；「复制链接」需要保留，但应以转发图标承载。用户要求预览流改为 X 风格的双列结构和四图标动作栏，同时不伪造互动数据。

## 目标

- 首页、搜索结果和标签筛选结果使用统一的 Tweet Cell 文章预览布局。
- 头像形成固定左列，头像下方保持为空，不允许标题、摘要、标签或动作栏绕排到该区域。
- 移除「阅读文章」和「复制链接」可见文字，改为评论、转发、爱心、阅读量四个图标位置。
- 保留转发按钮的复制链接行为与现有 Toast 反馈。
- 为未来评论、点赞、转发和阅读量后端接入保留稳定的 DOM 数据属性，但本轮不采集、保存或展示用户互动数据。
- 在桌面和最小支持宽度 `320px` 下保持可访问、无重叠、无横向溢出。

## 范围

本次修改共享的 `postMarkup()`，因此影响以下页面：

- 首页：`docs/index.html`
- 搜索结果：`docs/search.html`
- 标签筛选结果：`docs/tags.html`

归档页继续使用当前的紧凑列表，不改为 Tweet Cell。文章详情页、文章数据格式、Markdown 构建流程、顶部品牌栏、侧栏和移动底部导航均不在本次范围内。

## 选定结构

每个文章预览使用以下语义层次：

```html
<article class="post-item" data-post-id="<post.id>">
  <div class="post-avatar-column" aria-hidden="true">
    <span class="avatar">Y</span>
  </div>
  <div class="post-content">
    <div class="post-meta">...</div>
    <a class="post-link" href="<post.url>">
      <h2>文章标题</h2>
      <p>文章摘要</p>
    </a>
    <div class="post-tags">...</div>
    <div class="post-actions" aria-label="文章互动">
      <button class="post-action" type="button" data-post-action="comment"
        data-post-id="<post.id>" disabled aria-label="评论功能暂未开放" title="评论功能暂未开放">
        <svg aria-hidden="true"><use href="icons.svg#icon-comment"></use></svg>
      </button>
      <button class="post-action" type="button" data-post-action="repost"
        data-post-id="<post.id>" data-post-url="<post.url>" aria-label="转发并复制链接" title="转发并复制链接">
        <svg aria-hidden="true"><use href="icons.svg#icon-repost"></use></svg>
      </button>
      <button class="post-action" type="button" data-post-action="like"
        data-post-id="<post.id>" disabled aria-label="点赞功能暂未开放" title="点赞功能暂未开放">
        <svg aria-hidden="true"><use href="icons.svg#icon-like"></use></svg>
      </button>
      <span class="post-metric" data-engagement="views" data-post-id="<post.id>"
        role="img" aria-label="阅读量暂未统计" title="阅读量暂未统计">
        <svg aria-hidden="true"><use href="icons.svg#icon-views"></use></svg>
      </span>
    </div>
  </div>
</article>
```

`post.id` 是文章预览与未来互动数据的唯一前端关联键。模板生成时必须先执行 `escapeHtml(String(post.id))`，再写入所有 `data-post-id` 属性；不得把动态 ID 原样插入 HTML。`post.stats` 不参与本次渲染；页面不显示 `0`、占位数量或其他虚构数据。

标题和摘要链接是进入文章的主要路径。标签继续保持到 `tags.html` 的筛选链接。动作控件不嵌套在文章链接内，避免嵌套交互元素和键盘焦点冲突。

## 布局与视觉规则

`.post-item` 使用 CSS Grid，列定义为 `40px minmax(0, 1fr)`，列间距为 `12px`：

- `.post-avatar-column` 固定在第 1 列并向上对齐，只包含 `40 × 40px` 圆形头像。
- `.post-content` 固定在第 2 列，包含作者行、标题、摘要、标签和整个动作栏。
- 第 1 列在头像底部到文章分隔线之间必须为空。不得使用浮动、负边距或自动换行把内容重新放入头像列。
- 保留当前文章流的全宽底部分隔线、`1rem` 内边距及轻微 hover 背景；不新增卡片边框、圆角容器或装饰性背景。
- 标题、摘要和标签保持现有文字层级与标签链接颜色。

动作栏使用四等分 Grid：`repeat(4, minmax(44px, 1fr))`。每个操作区的最小触控尺寸为 `44 × 44px`，图标可见尺寸约 `20px`，在其等分区域中居中。基础颜色使用现有 `--muted`；可用的转发按钮在 hover 和键盘 focus 时使用现有强调色。不可用的评论和爱心不显示计数、不表现为成功状态。

桌面和移动端使用相同两列结构。`minmax(0, 1fr)` 是必须条件，用于让长标题、摘要和标签在内容列内换行而不是撑出页面；`320px` 宽度下头像与四个动作区均不得缩小或相交。

## 图标资源与可访问性

在 `docs/icons.svg` 中增加以下本地、线框风格 symbol：

- `icon-comment`：评论气泡。
- `icon-repost`：双箭头转发。
- `icon-like`：爱心。
- `icon-views`：阅读量柱状图。

图标沿用现有 SVG 精灵的 `currentColor`、圆角描边和 `viewBox="0 0 24 24"` 约定，不引入图标库、远程资源或手绘位图。

每个 SVG 都使用 `aria-hidden="true"`，语义由其父控件的 `aria-label` 提供。评论和爱心为禁用按钮，清晰声明功能未开放；转发为可操作按钮；阅读量为只读 `span`。`title` 属性为鼠标悬停提供简短说明，不在页面布局中显示文字。现有全局 `:focus-visible` 样式继续适用于可操作的转发按钮和文章链接。

## 行为与未来数据接口

`bindArticleActions()` 从广泛的 `[data-url]` 选择器收敛为 `[data-post-action="repost"]`。点击转发图标时读取 `data-post-url`，调用现有 `copyPostLink()`：复制绝对链接，成功显示「链接已复制」，失败显示「无法复制链接」。

本次不新增 API 地址、网络请求、浏览器指纹、IP 读取、Cookie、LocalStorage 互动状态、计数状态或评论容器。评论、点赞和阅读量只提供稳定的 `data-post-id`、`data-post-action`、`data-engagement` 挂点：

- 后端接入后可按 `data-post-id` 查询和回填真实计数。
- 评论服务可在文章详情页单独接入，不影响预览卡片结构。
- 点赞和转发后端可将禁用控件启用，并在不改变 CSS Grid 或语义层次的前提下绑定真实动作。
- 服务端可在未来决定匿名访客识别、IP 哈希、限流、隐私提示和数据保留策略；这些策略不在静态前端中预实现。

## 文件边界

- `docs/script.js`：重构 `postMarkup()` 的文章预览 DOM；仅为转发图标保留复制链接的事件委托。
- `docs/styles.css`：将文章预览改为两列 Grid，定义内容列和四图标动作栏的响应式样式。
- `docs/icons.svg`：增加评论、转发、爱心、阅读量 symbol。
- `tests/test_frontend_contract.py`：更新共享文章预览结构、数据挂点、无伪造计数和 CSS Grid 契约。
- `tests/visual.spec.mjs`：增加 Tweet Cell 几何、转发复制链接和窄屏不重叠断言。
- `tests/visual.spec.mjs-snapshots/desktop-home-linux.png`：更新桌面首页截图。
- `tests/visual.spec.mjs-snapshots/mobile-home-linux.png`：更新移动首页截图。
- `tests/visual.spec.mjs-snapshots/mobile-search-results-linux.png`：更新移动搜索结果截图。
- `tests/visual.spec.mjs-snapshots/mobile-tags-filtered-linux.png`：更新移动标签筛选结果截图。

不修改 `docs/posts.js`、文章详情页、归档页、顶部品牌栏资产和构建脚本。

## 测试与验收

静态契约测试必须验证：

- `postMarkup()` 在每个预览 `<article>` 上输出 `data-post-id`、头像列和内容列。
- 标题、摘要、标签和动作栏都位于内容列；已移除「阅读文章」和「复制链接」文字。
- 四个图标引用存在，评论、转发、爱心、阅读量的 action/metric 属性和无障碍名称正确。
- 仅转发控件携带 `data-post-url` 并调用复制逻辑；`post.stats`、`handleLike`、计数节点和持久化互动代码均不存在。
- CSS 包含 `40px minmax(0, 1fr)` 的文章 Grid、`repeat(4, minmax(44px, 1fr))` 的动作 Grid、`44px` 最小触控尺寸和现有 focus-visible 支持。
- `docs/icons.svg` 包含四个新 symbol；归档渲染路径未被改为 Tweet Cell。

Playwright 验证必须覆盖：

- 桌面首页、移动首页、移动搜索结果和移动标签筛选结果的截图基线。
- `320px` 宽度下，`.post-content` 的左边界始终位于头像右边界与 `12px` 列间距之后；头像下方区域没有文章内容盒子；页面没有横向溢出。
- 四个操作区均有至少 `44px` 的宽度和高度，彼此不重叠。
- 转发图标点击后调用剪贴板写入并显示「链接已复制」Toast；评论和爱心保持禁用，阅读量保持只读。
- 首页、搜索和标签页面都渲染相同的 Tweet Cell DOM；归档页不受影响。

完整验证命令：

```bash
python -m unittest discover -s tests -v
PLAYWRIGHT_BROWSER=1 python -m unittest discover -s tests -p 'test_visual_regression.py' -v
node --check docs/script.js
python scripts/build.py
git diff --check
```

## 完成标准

所有静态测试、浏览器包装测试、Playwright 视觉测试、脚本语法检查和静态构建通过。文章预览在首页、搜索结果和标签筛选结果中保持头像下方留空；转发复制链接可用；其余三个图标不制造互动数据；工作树中不存在与本功能无关的变更。