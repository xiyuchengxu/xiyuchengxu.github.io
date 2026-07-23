import unittest
from pathlib import Path


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = Path("docs/index.html").read_text(encoding="utf-8")
        cls.script = Path("docs/script.js").read_text(encoding="utf-8")
        cls.styles = Path("docs/styles.css").read_text(encoding="utf-8")

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
        self.assertIn('<h1>YuCheng 的博客</h1>', self.index)
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


if __name__ == "__main__":
    unittest.main()