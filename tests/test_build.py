import re
import tempfile
import unittest
from pathlib import Path

from scripts.build import BuildError, build_site, load_post


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

TEMPLATE = "<title>{{PAGE_TITLE}}</title><time>{{DATE}}</time><div>{{TAGS}}</div><main>{{CONTENT}}</main>"


class BuildSiteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.posts = self.root / "posts"
        self.posts.mkdir()
        self.docs = self.root / "docs"
        self.docs.mkdir()
        self.template = self.root / "template.html"
        self.template.write_text(TEMPLATE, encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, title, day, tags):
        body = VALID_POST.replace("title: 第一篇文章", f"title: {title}").replace(
            "date: 2024-01-15", f"date: {day}"
        )
        body = body.replace(
            "  - Python\n  - 建站",
            "\n".join(f"  - {tag}" for tag in tags),
        )
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


class RepositoryContractTests(unittest.TestCase):
    def test_renderer_uses_generated_fields_and_handles_detail_page(self):
        script = Path("docs/script.js").read_text(encoding="utf-8")
        for snippet in (
            "post.url",
            "post.title",
            "post.summary",
            'getElementById("postsList")',
        ):
            self.assertIn(snippet, script)

    def test_generated_urls_exist(self):
        build_site(
            Path("posts"),
            Path("docs"),
            Path("templates/post-template.html"),
        )
        index = Path("docs/posts.js").read_text(encoding="utf-8")
        urls = re.findall(r'"url": "(posts/[^"]+\.html)"', index)
        self.assertTrue(urls)
        for url in urls:
            self.assertTrue((Path("docs") / url).is_file())
