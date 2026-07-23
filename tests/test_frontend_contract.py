import struct
import unittest
import zlib
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _paeth_predictor(left, above, upper_left):
    estimate = left + above - upper_left
    left_distance = abs(estimate - left)
    above_distance = abs(estimate - above)
    upper_left_distance = abs(estimate - upper_left)
    if left_distance <= above_distance and left_distance <= upper_left_distance:
        return left
    if above_distance <= upper_left_distance:
        return above
    return upper_left


def _read_rgba_png(path):
    data = path.read_bytes()
    if data[:8] != PNG_SIGNATURE:
        raise ValueError(f"{path} is not a PNG")

    offset = 8
    header = None
    compressed = []
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        offset += 12 + length
        if chunk_type == b"IHDR":
            header = struct.unpack(">IIBBBBB", payload)
        elif chunk_type == b"IDAT":
            compressed.append(payload)
        elif chunk_type == b"IEND":
            break

    if header is None:
        raise ValueError(f"{path} has no IHDR chunk")
    width, height, bit_depth, color_type, compression, filter_method, interlace = header
    if (bit_depth, color_type, compression, filter_method, interlace) != (8, 6, 0, 0, 0):
        raise ValueError(f"{path} must be an 8-bit, non-interlaced RGBA PNG")

    raw = zlib.decompress(b"".join(compressed))
    bytes_per_pixel = 4
    stride = width * bytes_per_pixel
    if len(raw) != (stride + 1) * height:
        raise ValueError(f"{path} has an unexpected scanline length")

    decoded = bytearray()
    previous = bytearray(stride)
    cursor = 0
    for _ in range(height):
        filter_type = raw[cursor]
        cursor += 1
        scanline = bytearray(raw[cursor:cursor + stride])
        cursor += stride
        for index in range(stride):
            left = scanline[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            above = previous[index]
            upper_left = previous[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            if filter_type == 1:
                scanline[index] = (scanline[index] + left) & 0xFF
            elif filter_type == 2:
                scanline[index] = (scanline[index] + above) & 0xFF
            elif filter_type == 3:
                scanline[index] = (scanline[index] + ((left + above) // 2)) & 0xFF
            elif filter_type == 4:
                scanline[index] = (
                    scanline[index] + _paeth_predictor(left, above, upper_left)
                ) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"{path} uses unknown PNG filter {filter_type}")
        decoded.extend(scanline)
        previous = scanline

    return width, height, bytes(decoded)


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = Path("docs/index.html").read_text(encoding="utf-8")
        cls.script = Path("docs/script.js").read_text(encoding="utf-8")
        cls.styles = Path("docs/styles.css").read_text(encoding="utf-8")

    def test_home_topbar_assets_are_valid_local_png_files(self):
        expected_sizes = {
            Path("docs/assets/site-logo.png"): (128, 120),
            Path("docs/assets/avatar.png"): (256, 256),
        }
        decoded_assets = {}
        for path, expected_size in expected_sizes.items():
            self.assertTrue(path.is_file(), f"{path} must exist")
            self.assertGreater(path.stat().st_size, 1_000, f"{path} must not be empty")
            width, height, rgba = _read_rgba_png(path)
            self.assertEqual((width, height), expected_size)
            decoded_assets[path] = (width, height, rgba)

        width, height, logo_rgba = decoded_assets[Path("docs/assets/site-logo.png")]
        alpha_at = lambda x, y: logo_rgba[((y * width + x) * 4) + 3]
        self.assertEqual(
            [alpha_at(0, 0), alpha_at(width - 1, 0), alpha_at(0, height - 1), alpha_at(width - 1, height - 1)],
            [0, 0, 0, 0],
        )
        self.assertGreater(max(logo_rgba[3::4]), 0)

    def test_homepage_uses_accessible_three_slot_brand_bar(self):
        for snippet in (
            '<header class="timeline-header home-topbar" aria-label="首页顶部栏">',
            '<a class="topbar-avatar" href="about.html" aria-label="查看关于 YuCheng">',
            '<img src="assets/avatar.png" alt="" width="40" height="40">',
            '<h1 class="visually-hidden">YuCheng 的博客</h1>',
            '<a class="topbar-logo" href="index.html" aria-label="返回首页">',
            '<img src="assets/site-logo.png" alt="" width="128" height="120">',
            '<button class="icon-button topbar-theme" type="button" data-theme-toggle',
        ):
            self.assertIn(snippet, self.index)
        self.assertEqual(self.index.count('data-theme-toggle'), 1)
        self.assertEqual(self.index.count('YuCheng 的博客</h1>'), 1)

    def test_non_home_pages_keep_their_text_headers(self):
        page_titles = {
            "search.html": "搜索",
            "archive.html": "归档",
            "tags.html": "标签",
            "about.html": "关于",
        }
        for filename, title in page_titles.items():
            html = Path("docs", filename).read_text(encoding="utf-8")
            self.assertIn('<header class="timeline-header">', html)
            self.assertIn(f"<h1>{title}</h1>", html)
            self.assertNotIn("home-topbar", html)
            self.assertNotIn("topbar-avatar", html)
            self.assertNotIn("topbar-logo", html)

    def test_styles_define_centered_home_topbar_without_changing_shared_header(self):
        home_rules = self.styles.split(".timeline-header.home-topbar {", 1)[1].split("}", 1)[0]
        for snippet in (
            "display: grid",
            "grid-template-columns: 44px minmax(0, 1fr) 44px",
            "height: 56px",
            "min-height: 56px",
            "justify-content: normal",
            "gap: 0",
            "padding-block: 0",
        ):
            self.assertIn(snippet, home_rules)

        logo_rules = self.styles.split(".topbar-logo img {", 1)[1].split("}", 1)[0]
        for snippet in ("max-width: 44px", "height: 32px", "object-fit: contain"):
            self.assertIn(snippet, logo_rules)
        self.assertIn('[data-theme="light"] .topbar-logo img', self.styles)
        self.assertIn("filter: brightness(0)", self.styles)

    def test_homepage_has_semantic_three_column_and_page_navigation(self):
        for snippet in (
            '<nav class="sidebar-nav" aria-label="主导航">',
            '<main class="timeline" id="mainContent">',
            '<aside class="rail" id="rightRail" aria-label="博客辅助信息">',
            '<nav class="mobile-nav" aria-label="移动端导航">',
            'href="search.html"',
            'href="archive.html"',
            'href="tags.html"',
            'href="about.html"',
            'data-theme-toggle',
        ):
            self.assertIn(snippet, self.index)

    def test_homepage_contains_three_non_javascript_skeleton_items(self):
        self.assertEqual(self.index.count('class="skeleton-post"'), 3)
        self.assertIn('aria-busy="true"', self.index)
        self.assertIn('<noscript>', self.index)

    def test_script_exposes_real_blog_actions_without_social_counters(self):
        for snippet in (
            "function renderPosts(filteredPosts)",
            "function matchesFilter(post, filter)",
            "function filterPosts()",
            "navigator.clipboard.writeText",
            "function showToast(message)",
            'localStorage.setItem("blog-theme"',
            "post.url",
            "post.title",
            "post.summary",
        ):
            self.assertIn(snippet, self.script)
        for forbidden in ("handleLike", "like-count", "repost-btn", "reply-btn", "post.stats"):
            self.assertNotIn(forbidden, self.script)


    def test_styles_define_three_column_mobile_and_accessible_states(self):
        for snippet in (
            ".app-shell",
            "grid-template-columns: minmax(180px, 0.72fr) minmax(0, 640px) minmax(240px, 0.9fr)",
            ".post-item",
            ".skeleton-post",
            ".empty-state",
            ".mobile-nav",
            "@media (max-width: 980px)",
            "@media (max-width: 700px)",
            ":focus-visible",
            "prefers-reduced-motion: reduce",
        ):
            self.assertIn(snippet, self.styles)
        self.assertNotIn("linear-gradient", self.styles)


    def test_all_navigation_pages_exist_with_expected_page_type(self):
        pages = {
            "home": Path("docs/index.html"),
            "search": Path("docs/search.html"),
            "archive": Path("docs/archive.html"),
            "tags": Path("docs/tags.html"),
            "about": Path("docs/about.html"),
        }
        for page_name, page_path in pages.items():
            html = page_path.read_text(encoding="utf-8")
            self.assertIn(f'data-page="{page_name}"', html)
            self.assertIn('<nav class="mobile-nav" aria-label="移动端导航">', html)
            for label in ("首页", "搜索", "归档", "标签", "关于"):
                self.assertIn(f'aria-label="{label}"', html)
            self.assertIn('class="nav-label visually-hidden"', html)

    def test_homepage_is_limited_to_post_stream_and_compact_header(self):
        self.assertIn('<h1 class="visually-hidden">YuCheng 的博客</h1>', self.index)
        for obsolete in (
            "个人技术笔记",
            'id="postSearch"',
            'id="topic-tabs"',
            'id="tagCloud"',
            'id="archiveList"',
        ):
            self.assertNotIn(obsolete, self.index)
        self.assertIn('id="rightRail"', self.index)


    def test_script_has_page_initializers_and_query_safe_helpers(self):
        for snippet in (
            "function initHomePage()",
            "function initSearchPage()",
            "function initArchivePage()",
            "function initTagsPage()",
            "function initAboutPage()",
            "function getSelectedQuery(name)",
            "function groupPostsByMonth(posts)",
            "function getTagCounts(posts)",
            "encodeURIComponent(tag)",
            'localStorage.setItem("blog-theme"',
            "document.body.dataset.page",
        ):
            self.assertIn(snippet, self.script)

    def test_script_does_not_reintroduce_home_only_panels(self):
        for forbidden in ("topic-tabs", "renderTopicTabs"):
            self.assertNotIn(forbidden, self.script)


    def test_styles_support_page_variants_and_icon_only_mobile_navigation(self):
        for snippet in (
            ".visually-hidden",
            ".page-search",
            ".page-archive",
            ".page-tags",
            ".about-content",
            ".mobile-nav a",
            "min-width: 44px",
            "min-height: 44px",
            "@media (max-width: 760px)",
            "padding-bottom: calc(64px + env(safe-area-inset-bottom))",
        ):
            self.assertIn(snippet, self.styles)


    def test_search_page_has_loading_skeletons(self):
        search = Path("docs/search.html").read_text(encoding="utf-8")
        self.assertIn('id="pageContent" class="post-list" aria-live="polite" aria-busy="true"', search)
        self.assertEqual(search.count('class="skeleton-post"'), 3)


    def test_navigation_uses_local_svg_icons_with_accessible_links(self):
        icon_ids = {
            "index.html": "icon-home",
            "search.html": "icon-search",
            "archive.html": "icon-archive",
            "tags.html": "icon-tags",
            "about.html": "icon-about",
        }
        sprite_path = Path("docs/icons.svg")
        self.assertTrue(sprite_path.exists(), "docs/icons.svg must exist")
        sprite = sprite_path.read_text(encoding="utf-8")

        for icon_id in icon_ids.values():
            self.assertIn(f'id="{icon_id}"', sprite)
            self.assertIn(f'id="{icon_id}-active"', sprite)

        for filename, active_icon_id in icon_ids.items():
            html = Path("docs", filename).read_text(encoding="utf-8")
            self.assertEqual(html.count('class="nav-icon" aria-hidden="true"'), 10)
            self.assertIn('class="mobile-nav-links"', html)
            self.assertIn(f'href="icons.svg#{active_icon_id}-active"', html)
            for legacy_text_node in (">⌂<", ">⌕<", ">◷<", ">#<", ">i<"):
                self.assertNotIn(legacy_text_node, html)

    def test_styles_define_compact_svg_mobile_navigation(self):
        for snippet in (
            ".nav-icon",
            "width: 28px",
            "height: 28px",
            "stroke-width: 2.5",
            "grid-template-columns: repeat(5, 48px)",
            "width: 288px",
            "min-width: 48px",
            "min-height: 48px",
        ):
            self.assertIn(snippet, self.styles)
        self.assertNotIn("justify-content: space-around", self.styles)
        mobile_rules = self.styles.split("@media (max-width: 760px)", 1)[1]
        self.assertNotIn("background: var(--surface-hover);", mobile_rules)


if __name__ == "__main__":
    unittest.main()
