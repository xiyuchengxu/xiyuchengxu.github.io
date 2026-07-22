# Markdown 文章系统实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `posts/*.md` 构建为可发布的独立文章 HTML 和首页索引，并由 GitHub Actions 自动验证和提交生成物。

**架构：** `scripts/build.py` 解析并校验 YAML front matter，安全渲染 Markdown，原子写入 `docs/posts.js` 和 `docs/posts/*.html`。现有首页消费生成索引，详情页复用主题脚本与 CSS；GitHub Actions 在内容或构建逻辑变化时测试和构建。

**技术栈：** Python 3.12、Python-Markdown 3.7、PyYAML 6.0.2、`unittest`、HTML/CSS/原生 JavaScript、GitHub Actions

---

## 文件结构

- 创建 `requirements.txt`：固定 Python 依赖。
- 创建 `scripts/__init__.py`、`scripts/build.py`：可测试的构建模块与 CLI。
- 创建 `tests/test_build.py`、`tests/test_workflow.py`：构建和工作流契约测试。
- 创建 `templates/post-template.html`：文章详情页骨架。
- 创建 `posts/2024-01-15-hello-world.md`：首篇内容源。
- 生成 `docs/posts.js`、`docs/posts/*.html`：GitHub Pages 发布产物。
- 修改 `docs/script.js`、`docs/styles.css`：首页链接、安全初始化和详情页样式。
- 创建 `.github/workflows/build-posts.yml`：自动测试、构建和提交。
- 修改已批准规格：记录审查状态。

### 任务 1：文章解析与校验

**文件：**
- 创建：`requirements.txt`
- 创建：`scripts/__init__.py`
- 创建：`scripts/build.py`
- 创建：`tests/test_build.py`

- [ ] **步骤 1：固定并安装依赖**

```text
Markdown==3.7
PyYAML==6.0.2
```

运行：`python -m pip install -r requirements.txt`
预期：退出状态 0，安装指定版本。

- [ ] **步骤 2：编写失败测试**

```python
# tests/test_build.py
import tempfile
import unittest
from pathlib import Path

from scripts.build import BuildError, load_post

VALID_POST = """---
title: 第一篇文章
date: 2024-01-15
summary: 一段摘要。
tags:
  - Python
  - 建站
---

# 正文

<script>alert('x')</script>
"""

class LoadPostTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.posts = Path(self.temp.name) / "posts"
        self.posts.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name="2024-01-15-first.md", content=VALID_POST):
        path = self.posts / name
        path.write_text(content, encoding="utf-8")
        return path

    def test_valid_post_and_raw_html_escape(self):
        post = load_post(self.write())
        self.assertEqual((post.slug, post.title), ("2024-01-15-first", "第一篇文章"))
        self.assertEqual(post.date.isoformat(), "2024-01-15")
        self.assertEqual(post.tags, ["Python", "建站"])
        self.assertIn("<h1>正文</h1>", post.body_html)
        self.assertIn("&lt;script&gt;", post.body_html)
        self.assertNotIn("<script>", post.body_html)

    def test_missing_field(self):
        path = self.write(content=VALID_POST.replace("summary: 一段摘要。\n", ""))
        with self.assertRaisesRegex(BuildError, r"first\.md: 缺少必填字段 summary"):
            load_post(path)

    def test_filename_date_mismatch(self):
        with self.assertRaisesRegex(BuildError, "文件名日期 2024-01-16 与 date 2024-01-15 不一致"):
            load_post(self.write(name="2024-01-16-first.md"))

    def test_invalid_calendar_date(self):
        content = VALID_POST.replace("date: 2024-01-15", "date: 2024-02-30")
        with self.assertRaisesRegex(BuildError, "date 必须是有效的 YYYY-MM-DD 日期"):
            load_post(self.write(name="2024-02-30-first.md", content=content))

    def test_non_list_tags(self):
        content = VALID_POST.replace("tags:\n  - Python\n  - 建站", "tags: Python")
        with self.assertRaisesRegex(BuildError, "tags 必须是非空字符串列表"):
            load_post(self.write(content=content))
```

- [ ] **步骤 3：确认红灯**

运行：`python -m unittest tests.test_build.LoadPostTests -v`
预期：FAIL，`scripts.build` 不存在。

- [ ] **步骤 4：实现最少解析器**

```python
# scripts/build.py
from __future__ import annotations
import argparse
import html
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
import markdown
import yaml

REQUIRED_FIELDS = ("title", "date", "summary", "tags")
FILENAME = re.compile(r"^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")

class BuildError(ValueError):
    pass

@dataclass(frozen=True)
class Post:
    source: Path
    slug: str
    title: str
    date: date
    summary: str
    tags: list[str]
    body_html: str

def fail(path: Path, message: str) -> BuildError:
    return BuildError(f"{path.name}: {message}")

def load_post(path: Path) -> Post:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise fail(path, "缺少有效的 YAML front matter")
    front, body = text[4:].split("\n---\n", 1)
    try:
        data = yaml.safe_load(front)
    except yaml.YAMLError as exc:
        raise fail(path, f"YAML 无法解析: {exc}") from exc
    if not isinstance(data, dict):
        raise fail(path, "front matter 必须是对象")
    for field in REQUIRED_FIELDS:
        if field not in data:
            raise fail(path, f"缺少必填字段 {field}")
    match = FILENAME.fullmatch(path.name)
    if not match:
        raise fail(path, "文件名必须符合 YYYY-MM-DD-lowercase-slug.md")
    try:
        parsed_date = data["date"] if isinstance(data["date"], date) else date.fromisoformat(data["date"])
    except (TypeError, ValueError):
        raise fail(path, "date 必须是有效的 YYYY-MM-DD 日期")
    if match.group(1) != parsed_date.isoformat():
        raise fail(path, f"文件名日期 {match.group(1)} 与 date {parsed_date.isoformat()} 不一致")
    title, summary, tags = data["title"], data["summary"], data["tags"]
    if not isinstance(title, str) or not title.strip():
        raise fail(path, "title 必须是非空字符串")
    if not isinstance(summary, str) or not summary.strip():
        raise fail(path, "summary 必须是非空字符串")
    if not isinstance(tags, list) or not tags or any(not isinstance(x, str) or not x.strip() for x in tags):
        raise fail(path, "tags 必须是非空字符串列表")
    rendered = markdown.markdown(html.escape(body.strip()), extensions=["fenced_code", "sane_lists"], output_format="html5")
    return Post(path, path.stem, title.strip(), parsed_date, summary.strip(), [x.strip() for x in tags], rendered)
```

创建空的 `scripts/__init__.py`。

- [ ] **步骤 5：确认绿灯并提交**

运行：`python -m unittest tests.test_build.LoadPostTests -v`
预期：5 个测试 PASS。

```bash
git add requirements.txt scripts tests/test_build.py
git commit -m "feat(构建): 添加 Markdown 文章解析与校验"
```

### 任务 2：详情页与索引生成

**文件：**
- 修改：`scripts/build.py`
- 修改：`tests/test_build.py`
- 创建：`templates/post-template.html`

- [ ] **步骤 1：添加失败测试**

```python
from scripts.build import build_site

TEMPLATE = "<title>{{PAGE_TITLE}}</title><time>{{DATE}}</time><div>{{TAGS}}</div><main>{{CONTENT}}</main>"

class BuildSiteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.posts = self.root / "posts"; self.posts.mkdir()
        self.docs = self.root / "docs"; self.docs.mkdir()
        self.template = self.root / "template.html"; self.template.write_text(TEMPLATE, encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, title, day, tags):
        body = VALID_POST.replace("title: 第一篇文章", f"title: {title}").replace("date: 2024-01-15", f"date: {day}")
        body = body.replace("  - Python\n  - 建站", "\n".join(f"  - {tag}" for tag in tags))
        (self.posts / name).write_text(body, encoding="utf-8")

    def test_sorted_index_unique_tags_and_pages(self):
        self.write("2024-01-15-first.md", "第一篇", "2024-01-15", ["Python", "建站"])
        self.write("2024-01-16-second.md", "第二篇", "2024-01-16", ["Python", "CSS"])
        build_site(self.posts, self.docs, self.template)
        index = (self.docs / "posts.js").read_text(encoding="utf-8")
        self.assertLess(index.index('"第二篇"'), index.index('"第一篇"'))
        self.assertIn('"url": "posts/2024-01-16-second.html"', index)
        self.assertIn('const popularTags = ["Python", "CSS", "建站"];', index)
        self.assertTrue((self.docs / "posts/2024-01-15-first.html").is_file())

    def test_idempotence_and_stale_page_removal(self):
        self.write("2024-01-15-first.md", "第一篇", "2024-01-15", ["Python"])
        build_site(self.posts, self.docs, self.template)
        before = (self.docs / "posts.js").read_bytes()
        build_site(self.posts, self.docs, self.template)
        self.assertEqual(before, (self.docs / "posts.js").read_bytes())
        (self.posts / "2024-01-15-first.md").unlink()
        build_site(self.posts, self.docs, self.template)
        self.assertFalse((self.docs / "posts/2024-01-15-first.html").exists())
```

- [ ] **步骤 2：确认红灯**

运行：`python -m unittest tests.test_build.BuildSiteTests -v`
预期：FAIL，`build_site` 不存在。

- [ ] **步骤 3：创建详情页模板**

```html
<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="{{SUMMARY}}"><title>{{PAGE_TITLE}}</title><link rel="stylesheet" href="../styles.css"></head>
<body class="post-page"><header class="article-toolbar"><a class="back-link" href="../index.html" aria-label="返回首页">←</a><span class="logo">YuCheng</span><button class="theme-btn" id="themeToggle" aria-label="切换主题"><svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true"></svg></button></header><main class="article-shell"><article class="article-content"><header class="article-header"><h1>{{TITLE}}</h1><time datetime="{{DATE}}">{{DATE}}</time><div class="post-tags">{{TAGS}}</div></header><div class="markdown-body">{{CONTENT}}</div></article></main><script src="../script.js"></script></body></html>
```

- [ ] **步骤 4：实现生成器**

在 `scripts/build.py` 导入 `json`、`os`、`tempfile`，并实现：

```python
AUTHOR = {"name": "YuCheng", "handle": "@xiyuchengxu", "verified": True}
EMPTY_STATS = {"replies": 0, "reposts": 0, "likes": 0}

def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        os.replace(temp_name, path)
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise

def render_page(template: str, post: Post) -> str:
    values = {"PAGE_TITLE": html.escape(f"{post.title} | YuCheng 的博客"), "TITLE": html.escape(post.title), "SUMMARY": html.escape(post.summary, quote=True), "DATE": post.date.isoformat(), "TAGS": "".join(f'<span class="tag">#{html.escape(x)}</span>' for x in post.tags), "CONTENT": post.body_html}
    for key, value in values.items():
        template = template.replace(f"{{{{{key}}}}}", value)
    return template.rstrip() + "\n"

def index_js(posts: list[Post]) -> str:
    items, tags, seen = [], [], set()
    for number, post in enumerate(posts, 1):
        items.append({"id": number, "author": AUTHOR, "date": post.date.isoformat(), "title": post.title, "summary": post.summary, "content": post.summary, "url": f"posts/{post.slug}.html", "tags": post.tags, "stats": EMPTY_STATS})
        for tag in post.tags:
            if tag not in seen: seen.add(tag); tags.append(tag)
    return f"// 此文件由 scripts/build.py 生成，请勿手工修改。\nconst posts = {json.dumps(items, ensure_ascii=False, indent=2)};\n\nconst popularTags = {json.dumps(tags, ensure_ascii=False)};\n"

def build_site(posts_dir: Path, docs_dir: Path, template_path: Path) -> None:
    posts = [load_post(path) for path in sorted(posts_dir.glob("*.md"))] if posts_dir.exists() else []
    posts.sort(key=lambda post: (post.date, post.slug), reverse=True)
    template = template_path.read_text(encoding="utf-8")
    output = docs_dir / "posts"; output.mkdir(parents=True, exist_ok=True)
    expected = {f"{post.slug}.html" for post in posts}
    for path in output.glob("*.html"):
        if path.name not in expected: path.unlink()
    for post in posts:
        atomic_write(output / f"{post.slug}.html", render_page(template, post))
    atomic_write(docs_dir / "posts.js", index_js(posts))

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try: build_site(args.root / "posts", args.root / "docs", args.root / "templates/post-template.html")
    except (BuildError, OSError) as exc: parser.exit(1, f"构建失败: {exc}\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **步骤 5：确认绿灯并提交**

运行：`python -m unittest discover -s tests -v`
预期：7 个测试 PASS。

```bash
git add scripts/build.py tests/test_build.py templates/post-template.html
git commit -m "feat(构建): 生成文章详情页和首页索引"
```

### 任务 3：首页接入和首篇文章

**文件：**
- 创建：`posts/2024-01-15-hello-world.md`
- 修改：`docs/script.js`、`docs/styles.css`、`tests/test_build.py`
- 生成：`docs/posts.js`、`docs/posts/2024-01-15-hello-world.html`

- [ ] **步骤 1：添加仓库契约失败测试**

```python
import re

class RepositoryContractTests(unittest.TestCase):
    def test_renderer_uses_generated_fields_and_handles_detail_page(self):
        script = Path("docs/script.js").read_text(encoding="utf-8")
        for text in ('href="${post.url}"', "${post.title}", "${post.summary}", "if (!postsList) return;"):
            self.assertIn(text, script)

    def test_generated_urls_exist(self):
        build_site(Path("posts"), Path("docs"), Path("templates/post-template.html"))
        index = Path("docs/posts.js").read_text(encoding="utf-8")
        urls = re.findall(r'"url": "(posts/[^"]+\.html)"', index)
        self.assertTrue(urls)
        for url in urls: self.assertTrue((Path("docs") / url).is_file())
```

运行：`python -m unittest tests.test_build.RepositoryContractTests -v`
预期：FAIL，首页尚未消费新字段。

- [ ] **步骤 2：创建首篇文章**

```markdown
---
title: 你好，世界
date: 2024-01-15
summary: 介绍这个博客，以及 Markdown 文章系统如何让写作与发布更简单。
tags:
  - 建站
  - Markdown
  - Web 开发
---

# 你好，世界

这是这个博客的第一篇 Markdown 文章。

现在，文章只需放在 `posts/` 目录中，构建器会生成详情页和首页索引。
```

- [ ] **步骤 3：接入首页渲染**

在 `renderPosts()` 获取 `postsList` 后加入 `if (!postsList) return;`，并用以下内容替换原 `.post-content`：

```javascript
<a class="post-title-link" href="${post.url}"><h2 class="post-title">${post.title}</h2></a>
<div class="post-content">${post.summary}</div>
```

- [ ] **步骤 4：增加详情页样式**

在 `docs/styles.css` 末尾增加以下样式：

```css
.post-title-link {
  color: inherit;
  text-decoration: none;
}

.post-title-link:hover .post-title {
  text-decoration: underline;
}

.post-title {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.3;
}

.article-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 53px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.back-link {
  color: var(--text-primary);
  font-size: 24px;
  text-decoration: none;
}

.article-shell {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  border-inline: 1px solid var(--border-color);
}

.article-content {
  padding: 32px;
  overflow-wrap: anywhere;
}

.article-header h1 {
  margin: 0 0 12px;
  font-size: 32px;
  line-height: 1.25;
}

.article-header time {
  color: var(--text-secondary);
}

.article-header .post-tags {
  margin-top: 16px;
}

.markdown-body {
  margin-top: 32px;
  font-size: 17px;
  line-height: 1.7;
}

.markdown-body pre {
  overflow-x: auto;
  padding: 16px;
  border-radius: 8px;
  background: var(--bg-secondary);
}

.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
}

@media (max-width: 640px) {
  .article-shell {
    max-width: none;
    border-inline: 0;
  }

  .article-content {
    padding: 24px 16px;
  }

  .article-header h1 {
    font-size: 28px;
  }
}
```

- [ ] **步骤 5：构建、验证并提交**

```bash
python scripts/build.py
python -m unittest discover -s tests -v
python scripts/build.py
git diff --check
```

预期：9 个测试 PASS；第二次构建不改变生成物；差异检查无输出。

```bash
git add posts docs/posts.js docs/script.js docs/styles.css tests/test_build.py
git commit -m "feat(博客): 接入 Markdown 文章详情页"
```

### 任务 4：GitHub Actions 自动构建

**文件：**
- 创建：`.github/workflows/build-posts.yml`
- 创建：`tests/test_workflow.py`

- [ ] **步骤 1：编写失败测试**

```python
import unittest
from pathlib import Path
import yaml

class WorkflowTests(unittest.TestCase):
    def test_workflow_contract(self):
        data = yaml.safe_load(Path(".github/workflows/build-posts.yml").read_text(encoding="utf-8"))
        self.assertEqual(data["permissions"]["contents"], "write")
        self.assertIn("concurrency", data)
        commands = "\n".join(step.get("run", "") for step in data["jobs"]["build"]["steps"])
        for text in ("python -m unittest discover -s tests -v", "python scripts/build.py", "git diff --quiet", "git pull --rebase", "[skip ci]"):
            self.assertIn(text, commands)
        push = data[True]["push"]  # PyYAML 1.1 将 on 解析为 True
        self.assertEqual(push["branches"], ["main"])
        for path in ("posts/**", "scripts/**", "templates/**", "tests/**", "requirements.txt"):
            self.assertIn(path, push["paths"])
```

运行：`python -m unittest tests.test_workflow -v`
预期：ERROR，工作流文件不存在。

- [ ] **步骤 2：创建工作流**

```yaml
name: Build Markdown posts
on:
  push:
    branches: [main]
    paths: ["posts/**", "scripts/**", "templates/**", "tests/**", "requirements.txt", ".github/workflows/build-posts.yml"]
  workflow_dispatch:
permissions:
  contents: write
concurrency:
  group: build-posts-${{ github.ref }}
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: {fetch-depth: 0}
      - uses: actions/setup-python@v5
        with: {python-version: "3.12", cache: pip}
      - run: python -m pip install -r requirements.txt
      - run: python -m unittest discover -s tests -v
      - run: python scripts/build.py
      - name: Commit generated files
        run: |
          if git diff --quiet -- docs/posts.js docs/posts; then exit 0; fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add docs/posts.js docs/posts
          git commit -m "chore(博客): 更新文章生成物 [skip ci]"
          git pull --rebase origin main
          git push origin HEAD:main
```

- [ ] **步骤 3：验证并提交**

运行：`python -m unittest discover -s tests -v && python scripts/build.py && git diff --check`
预期：10 个测试 PASS，构建和差异检查退出状态 0。

```bash
git add .github/workflows/build-posts.yml tests/test_workflow.py
git commit -m "ci(博客): 自动构建 Markdown 文章"
```

### 任务 5：最终验收、集成和远程核验

**文件：**
- 修改：`docs/superpowers/specs/2026-07-22-markdown-post-system-design.md`

- [ ] **步骤 1：把规格末尾「用户审查书面规格」和「过渡到实现计划」改为已完成并提交**

```bash
git add docs/superpowers/specs/2026-07-22-markdown-post-system-design.md
git commit -m "docs(文章系统): 记录规格批准状态"
```

- [ ] **步骤 2：在功能分支最终验证**

```bash
python -m unittest discover -s tests -v
python scripts/build.py
git diff --exit-code -- docs/posts.js docs/posts
python -m py_compile scripts/build.py tests/test_build.py tests/test_workflow.py
git diff --check
git status --short --branch
```

预期：10 个测试 PASS；构建幂等；Python 编译和差异检查退出状态 0；工作区干净。

- [ ] **步骤 3：主工作区核对并快进合并**

```bash
cd /workspace/YuCheng_web
git remote -v
git status --short --branch
git fetch origin main
git rev-parse main
git rev-parse origin/main
git merge --ff-only feature/markdown-post-system
```

预期：`origin` 是 `https://github.com/xiyuchengxu/YuCheng_web.git`，主工作区干净；若远程出现新提交则停止并重新评估；否则快进成功。

- [ ] **步骤 4：在 main 重跑验证并推送**

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python scripts/build.py
git diff --exit-code -- docs/posts.js docs/posts
git diff --check
git push origin main
```

预期：10 个测试 PASS，构建幂等，推送退出状态 0。

- [ ] **步骤 5：双重核验远程**

```bash
git fetch origin main
test "$(git rev-parse main)" = "$(git rev-parse origin/main)"
git ls-tree -r --name-only origin/main | grep -E '^(posts/2024-01-15-hello-world.md|scripts/build.py|templates/post-template.html|docs/posts/2024-01-15-hello-world.html|\.github/workflows/build-posts.yml)$'
```

预期：本地与远程提交 ID 一致，输出 5 个关键文件。若 `gh` 已安装且认证，再运行 `gh run list --workflow build-posts.yml --limit 1` 和 `gh run watch --exit-status`；否则明确报告 Actions 未经 CLI 核验。