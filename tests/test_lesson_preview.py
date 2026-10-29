"""Teaching previews must show the same RGB pixels as the real detector adapter."""
import base64
import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
from PIL import Image

import build_demo
from detector import AnimalDetector, LABELS


class LessonPreviewTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / "results").mkdir()
        pixels = np.random.default_rng(11).integers(0, 256, (97, 213, 3), dtype=np.uint8)
        path = self.root / "results" / "photo.jpg"
        Image.fromarray(pixels).save(path, format="JPEG")
        self.variant = {"id": "clear", "input_file": "results/photo.jpg",
                        "input_sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        patch = mock.patch.object(build_demo, "ROOT", self.root)
        patch.start()
        self.addCleanup(patch.stop)

    def test_lossless_preview_matches_the_real_adapters_tensor_pixels(self):
        feeds = []

        class CaptureSession:
            def run(self, outputs, inputs):
                feeds.append(next(iter(inputs.values())))
                return [np.zeros((1, 300, 6), dtype=np.float32)]

        detector = AnimalDetector.__new__(AnimalDetector)
        detector.session, detector.input_name, detector.labels = CaptureSession(), "images", LABELS
        with Image.open(self.root / self.variant["input_file"]) as image:
            self.assertEqual(detector.predict(image), [])
        preview = build_demo.lesson_letterbox(self.variant)
        raw = base64.b64decode(preview["lesson_letterbox"].split(",", 1)[1])
        with Image.open(io.BytesIO(raw)) as image:
            shown = np.asarray(image)
            self.assertEqual(image.size, (640, 640))
            self.assertEqual(hashlib.sha256(image.tobytes()).hexdigest(),
                             preview["lesson_letterbox_sha256"])
        actual = np.rint(feeds[0][0].transpose(1, 2, 0) * 255).astype(np.uint8)
        np.testing.assert_array_equal(shown, actual)

    def test_changed_source_bytes_cannot_receive_a_stale_saved_preview(self):
        (self.root / self.variant["input_file"]).write_bytes(b"changed input")
        with self.assertRaisesRegex(ValueError, "no longer matches"):
            build_demo.lesson_letterbox(self.variant)

    def test_render_preparation_preserves_original_bundle_metadata(self):
        bundle = {"photos": [{"id": "deer_4", "variants": [self.variant]}]}
        prepared = build_demo.with_lesson_previews(bundle)
        self.assertNotIn("lesson_letterbox", self.variant)
        self.assertIn("lesson_letterbox", prepared["photos"][0]["variants"][0])
        self.assertEqual(prepared["photos"][0]["variants"][0]["input_sha256"],
                         self.variant["input_sha256"])


if __name__ == "__main__":
    unittest.main()
