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
        ):
            self.assertIn(snippet, self.index)

    def test_homepage_contains_three_non_javascript_skeleton_items(self):
        self.assertEqual(self.index.count('class="skeleton-post"'), 3)
        self.assertIn('aria-busy="true"', self.index)
        self.assertIn('<noscript>', self.index)


if __name__ == "__main__":
    unittest.main()