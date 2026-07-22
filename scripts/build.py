from __future__ import annotations

import argparse
import html
import json
import os
import re
import tempfile
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
    except ValueError as exc:
        raise fail(path, "date 必须是有效的 YYYY-MM-DD 日期") from exc
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
    if not isinstance(tags, list) or not tags or any(not isinstance(item, str) or not item.strip() for item in tags):
        raise fail(path, "tags 必须是非空字符串列表")
    rendered = markdown.markdown(
        html.escape(body.strip()),
        extensions=["fenced_code", "sane_lists"],
        output_format="html5",
    )
    return Post(
        path,
        path.stem,
        title.strip(),
        parsed_date,
        summary.strip(),
        [item.strip() for item in tags],
        rendered,
    )

AUTHOR = {"name": "YuCheng", "handle": "@xiyuchengxu", "verified": True}
EMPTY_STATS = {"replies": 0, "reposts": 0, "likes": 0}


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", text=True
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        os.replace(temp_name, path)
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise


def render_page(template: str, post: Post) -> str:
    values = {
        "PAGE_TITLE": html.escape(f"{post.title} | YuCheng 的博客"),
        "TITLE": html.escape(post.title),
        "SUMMARY": html.escape(post.summary, quote=True),
        "DATE": post.date.isoformat(),
        "TAGS": "".join(
            f'<span class="tag">#{html.escape(tag)}</span>' for tag in post.tags
        ),
        "CONTENT": post.body_html,
    }
    for key, value in values.items():
        template = template.replace(f"{{{{{key}}}}}", value)
    return template.rstrip() + "\n"


def index_js(posts: list[Post]) -> str:
    items = []
    tags = []
    seen = set()
    for number, post in enumerate(posts, 1):
        items.append(
            {
                "id": number,
                "author": AUTHOR,
                "date": post.date.isoformat(),
                "title": post.title,
                "summary": post.summary,
                "content": post.summary,
                "url": f"posts/{post.slug}.html",
                "tags": post.tags,
                "stats": EMPTY_STATS,
            }
        )
        for tag in post.tags:
            if tag not in seen:
                seen.add(tag)
                tags.append(tag)
    return (
        "// 此文件由 scripts/build.py 生成，请勿手工修改。\n"
        f"const posts = {json.dumps(items, ensure_ascii=False, indent=2)};\n\n"
        f"const popularTags = {json.dumps(tags, ensure_ascii=False)};\n"
    )


def build_site(posts_dir: Path, docs_dir: Path, template_path: Path) -> None:
    posts = (
        [load_post(path) for path in sorted(posts_dir.glob("*.md"))]
        if posts_dir.exists()
        else []
    )
    posts.sort(key=lambda post: (post.date, post.slug), reverse=True)
    template = template_path.read_text(encoding="utf-8")
    output = docs_dir / "posts"
    output.mkdir(parents=True, exist_ok=True)
    expected = {f"{post.slug}.html" for post in posts}
    for path in output.glob("*.html"):
        if path.name not in expected:
            path.unlink()
    for post in posts:
        atomic_write(output / f"{post.slug}.html", render_page(template, post))
    atomic_write(docs_dir / "posts.js", index_js(posts))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1]
    )
    args = parser.parse_args()
    try:
        build_site(
            args.root / "posts",
            args.root / "docs",
            args.root / "templates/post-template.html",
        )
    except (BuildError, OSError) as exc:
        parser.exit(1, f"构建失败: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
