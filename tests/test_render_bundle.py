"""The self-contained export must preserve metadata without closing its script."""
import json
import re
import unittest

from build_demo import render_html


class BundleRenderingTests(unittest.TestCase):
    def test_html_sensitive_metadata_round_trips_without_script_injection(self):
        bundle = {"title": "Deer & coyotes < together >",
                  "source": "</script><script>untrusted text</script>",
                  "unicode": "A student’s questions"}
        html = render_html(bundle)
        encoded = re.search(r"const BUNDLE = (.*?);\n", html).group(1)
        self.assertEqual(json.loads(encoded), bundle)
        self.assertNotIn("</script", encoded.lower())
        self.assertNotIn("__LESSON_", html)
        self.assertNotIn("__LAB_JS__", html)
        self.assertNotIn("__CAMERA_TRAP_", html)
        self.assertNotIn("__INFERENCE_CSS__", html)
        self.assertNotIn("__PHOTO_TRAINING_", html)
        self.assertNotIn("__ML_GUIDE_", html)
        self.assertNotIn("__ML_RESOURCES_", html)


if __name__ == "__main__":
    unittest.main()
