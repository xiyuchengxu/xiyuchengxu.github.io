# Markdown 文章系统设计

## 背景与目标

当前站点从 `docs/posts.js` 读取手工维护的文章摘要，文章卡片没有详情页链接。此次改造将 `posts/` 中的 Markdown 文件设为唯一内容源，并生成可由 GitHub Pages 直接发布的静态文件。

成功标准如下：

- 在 `posts/` 新增一篇格式正确的 Markdown 文章后，本地构建可生成对应的 `docs/posts/YYYY-MM-DD-title.html`。
- 构建同时重写 `docs/posts.js`，首页按日期倒序显示文章，卡片可进入独立详情页。
- 详情页沿用当前深色、浅色和 Sepia 主题，支持移动端布局。
- 推送内容或构建逻辑后，GitHub Actions 自动构建并将生成物提交回 `main`。
- 本地测试覆盖元数据解析、Markdown 渲染、索引生成、链接和错误输入。

## 方案选择

采用「Python 静态生成器 + GitHub Actions 提交生成物」。生成文件保留在 `docs/`，与仓库当前的 GitHub Pages 发布目录一致。

未采用的方案：

- 浏览器运行时渲染 Markdown：部署简单，但详情页依赖 JavaScript 和网络资源，不利于直接访问与搜索引擎索引。
- 手工维护 HTML 和 `posts.js`：依赖最少，但内容会在多处重复，容易出现索引与详情页不一致。

## 内容契约

每篇文章位于 `posts/YYYY-MM-DD-title.md`，使用 YAML front matter：

```yaml
---
title: 你好，世界
date: 2024-01-15
summary: 介绍这个博客的第一篇文章。
tags:
  - 建站
  - Web 开发
---
```

必填字段为 `title`、`date`、`summary` 和 `tags`。文件名必须以与 `date` 相同的日期开头；文件名去掉 `.md` 后直接作为输出名。构建器遇到缺失字段、非法日期、非列表标签、重复输出名或不匹配的文件名日期时，以非零状态退出，并指出源文件和原因。

Markdown 正文支持标题、段落、强调、链接、列表、引用、行内代码和围栏代码块。构建时对原始 HTML 进行转义，不允许文章注入任意 HTML。

## 架构与数据流

- `scripts/build.py`：发现并解析文章，校验内容契约，渲染正文，生成详情页和首页数据。
- `templates/post-template.html`：文章详情页骨架，引用 `../styles.css` 与 `../script.js`，并提供返回首页链接。
- `posts/*.md`：作者维护的唯一文章源。
- `docs/posts/*.html`：构建生成的详情页。
- `docs/posts.js`：构建生成的首页文章元数据。
- `.github/workflows/build-posts.yml`：安装固定版本依赖，运行测试和构建，在生成物变化时提交回 `main`。

数据流为：读取 Markdown → 校验 front matter → 渲染安全 HTML → 按日期倒序 → 写入详情页 → 原子重写 `docs/posts.js`。构建前清理仅由构建器管理的 `docs/posts/*.html`，防止删除源文章后留下失效页面。

## 首页与详情页行为

`docs/posts.js` 中每项新增 `title`、`summary` 和 `url`。首页卡片显示标题和摘要，标题链接到 `posts/YYYY-MM-DD-title.html`；交互按钮继续独立工作，不因卡片链接产生误跳转。标签云从全部文章标签去重生成。

详情页沿用现有 CSS 变量和主题切换逻辑。`script.js` 在首页容器不存在时仍可安全初始化主题。文章正文使用独立的语义化样式，控制内容宽度、代码块横向滚动、图片最大宽度和长文本换行。

## 自动化与权限

工作流在推送到 `main` 且以下路径变化时触发：`posts/**`、`scripts/**`、`templates/**`、测试文件、依赖文件和工作流自身。工作流授予 `contents: write`，使用 GitHub Actions 机器人身份提交，提交信息包含 `[skip ci]`，避免生成物提交再次触发循环。

工作流先执行测试，再执行构建，并通过 `git diff --exit-code` 判断是否需要提交。推送前拉取当前分支的最新状态；若并发运行，使用 concurrency 组串行化同一分支的构建。

## 测试与验收

使用 Python 标准库 `unittest` 创建临时站点夹具，避免修改真实 `docs/`。测试至少覆盖：

- 合法文章生成预期 HTML、转义内容和首页 URL。
- 多篇文章按日期倒序，标签去重。
- 缺失字段、日期不匹配和非法标签导致构建失败。
- 第二次构建结果不变，删除源文章会删除对应生成页。
- `docs/posts.js` 可被现有首页结构消费，生成链接指向实际存在的文件。

本地验收命令为：

```bash
python -m unittest discover -s tests -v
python scripts/build.py
git diff --check
```

推送后再次核对 `origin/main` 的提交 ID、远程文件树和 GitHub Actions 运行结果，不以本地 `git push` 返回文本作为唯一成功依据。

## 范围限制

此次不实现评论、搜索、归档筛选、服务端点赞或草稿系统。现有标签页和底部导航的占位交互保持不变。

## 设计流程状态

- [x] 探索项目上下文、提交历史与远程状态
- [x] 判断无需视觉伴侣
- [x] 确认目的、约束和成功标准
- [x] 比较 3 种实现方案并选定静态生成方案
- [x] 展示并确认架构、数据流、错误处理和测试设计
- [x] 编写设计文档
- [x] 完成占位符、一致性、范围和模糊性自检
- [x] 用户审查书面规格（已于 2026-07-22 批准）
- [x] 过渡到实现计划（已创建并开始执行）