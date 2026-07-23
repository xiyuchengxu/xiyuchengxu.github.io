# YuCheng 的博客

这是一个基于 Markdown 的个人技术博客项目。文章存放在 `posts/` 目录，通过构建脚本生成静态文章页和文章索引，并发布到 GitHub Pages。

## 特性

- **Markdown 写作**：使用 `posts/*.md` 管理文章内容，支持 front matter 元数据。
- **静态文章页**：自动生成 `docs/posts/*.html`，文章详情页可直接访问和分享。
- **多页面导航**：包含首页、搜索、归档、标签和关于页面。
- **仿 X 风格**：移动端使用纯图标底部导航，页面结构更适合浏览文章流。
- **主题切换**：支持深色和浅色主题，并在页面之间保持一致。
- **自动构建**：GitHub Actions 可根据 Markdown 文章和模板变更更新文章索引与生成页面。

## 目录结构

```text
docs/                         # GitHub Pages 发布目录
├── index.html                 # 首页，展示文章流
├── search.html                # 搜索页面
├── archive.html               # 归档页面
├── tags.html                  # 标签页面
├── about.html                 # 关于页面
├── posts.js                   # 构建生成的文章索引
├── posts/                     # 构建生成的文章详情页
├── icons.svg                  # 本地图标精灵
├── styles.css                 # 站点样式
└── script.js                  # 前端交互逻辑

posts/                         # Markdown 文章源文件
scripts/build.py               # 文章构建脚本
templates/post-template.html   # 文章详情页模板
.github/workflows/             # GitHub Actions 工作流
requirements.txt               # Python 构建依赖
README.md                      # 项目说明
```

## 使用说明

### 本地准备

```bash
python -m venv /tmp/yucheng-blog-venv
/tmp/yucheng-blog-venv/bin/python -m pip install -r requirements.txt
```

### 构建文章

```bash
/tmp/yucheng-blog-venv/bin/python scripts/build.py
```

构建完成后会更新：

- `docs/posts.js`
- `docs/posts/*.html`

### 本地预览

```bash
python -m http.server 8000 --directory docs
```

然后打开：

- 首页：`http://127.0.0.1:8000/`
- 搜索：`http://127.0.0.1:8000/search.html`
- 归档：`http://127.0.0.1:8000/archive.html`
- 标签：`http://127.0.0.1:8000/tags.html`
- 关于：`http://127.0.0.1:8000/about.html`

## 写文章

在 `posts/` 目录中新建 Markdown 文件，文件名建议使用：

```text
YYYY-MM-DD-title.md
```

示例：

```markdown
---
title: Hello World
date: 2024-01-15
summary: 第一篇博客文章。
tags:
  - 建站
  - Markdown
---

这里是文章正文。
```

保存后运行构建命令：

```bash
/tmp/yucheng-blog-venv/bin/python scripts/build.py
```

生成的文章页面会位于 `docs/posts/`，首页、搜索、归档和标签页面会从 `docs/posts.js` 读取文章数据。

## 部署

本项目适合使用 GitHub Pages 部署：

- Source：`Deploy from a branch`
- Branch：`main`
- Folder：`/docs`

文章源、模板或构建脚本变更推送到 `main` 后，`.github/workflows/build-posts.yml` 会运行构建流程，并在需要时提交更新后的文章索引和详情页。

## 许可证

本仓库暂未声明开源许可证。使用、复制或二次分发前，请先确认作者授权。
