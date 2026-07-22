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