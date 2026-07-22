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