import os
import subprocess
import unittest


class VisualRegressionTests(unittest.TestCase):
    @unittest.skipUnless(
        os.environ.get("PLAYWRIGHT_BROWSER") == "1",
        "set PLAYWRIGHT_BROWSER=1 to run browser screenshots",
    )
    def test_playwright_visual_suite(self):
        result = subprocess.run(["npm", "run", "test:visual"], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)