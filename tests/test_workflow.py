import unittest
from pathlib import Path

import yaml


class WorkflowTests(unittest.TestCase):
    def test_workflow_contract(self):
        workflow = Path(".github/workflows/build-posts.yml")
        data = yaml.safe_load(workflow.read_text(encoding="utf-8"))
        self.assertEqual(data["permissions"]["contents"], "write")
        self.assertIn("concurrency", data)
        commands = "\n".join(
            step.get("run", "") for step in data["jobs"]["build"]["steps"]
        )
        for text in (
            "python -m unittest discover -s tests -v",
            "python scripts/build.py",
            "git diff --quiet",
            "git pull --rebase",
            "[skip ci]",
        ):
            self.assertIn(text, commands)
        push = data[True]["push"]
        self.assertEqual(push["branches"], ["main"])
        for path in (
            "posts/**",
            "scripts/**",
            "templates/**",
            "tests/**",
            "requirements.txt",
        ):
            self.assertIn(path, push["paths"])


if __name__ == "__main__":
    unittest.main()