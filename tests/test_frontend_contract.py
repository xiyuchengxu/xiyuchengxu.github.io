import unittest
from pathlib import Path


class FrontendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = Path("docs/index.html").read_text(encoding="utf-8")
        cls.script = Path("docs/script.js").read_text(encoding="utf-8")
        cls.styles = Path("docs/styles.css").read_text(encoding="utf-8")

    def test_homepage_has_semantic_three_column_and_mobile_navigation(self):
        for snippet in (
            '<nav class="sidebar-nav" aria-label="主导航">',
            '<main class="timeline" id="mainContent">',
            '<aside class="rail" aria-label="博客辅助信息">',
            '<nav class="mobile-nav" aria-label="移动端导航">',
            'data-view="search"',
            'data-view="archive"',
            'data-view="tags"',
            'data-view="about"',
            'id="articles"',
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


if __name__ == "__main__":
    unittest.main()