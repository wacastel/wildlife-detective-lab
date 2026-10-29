"""The local app loads approved saved images on demand; the export stays embedded."""
import hashlib
from http.server import ThreadingHTTPServer
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest import mock
import urllib.error
import urllib.request

from PIL import Image

import app


class QuietHandler(app.Handler):
    def log_message(self, *_args):
        pass


class SavedPageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "results" / "crops").mkdir(parents=True)
        self.input_bytes = self.jpeg("red")
        self.crop_bytes = self.jpeg("blue")
        (self.root / "results" / "input.jpg").write_bytes(self.input_bytes)
        (self.root / "results" / "crops" / "crop.jpg").write_bytes(self.crop_bytes)
        self.input_hash = hashlib.sha256(self.input_bytes).hexdigest()
        self.crop_hash = hashlib.sha256(self.crop_bytes).hexdigest()
        self.metadata = {"photos": [
            {"id": "fixture_" + str(index), "variants": [{
                "id": "clear", "input_file": "results/input.jpg",
                "input_sha256": self.input_hash,
                "species_crops": [{"input_file": "results/crops/crop.jpg",
                                   "input_sha256": self.crop_hash}]}]}
            for index in range(32)]}
        self.write_metadata()
        self.offline = b"<html>Fully embedded export: data:image/jpeg;base64,fixture</html>"
        (self.root / "offline_demo.html").write_bytes(self.offline)
        self.root_patch = mock.patch.object(app, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    @staticmethod
    def jpeg(color):
        encoded = io.BytesIO()
        Image.new("RGB", (16, 8), color).save(encoded, format="JPEG")
        return encoded.getvalue()

    def write_metadata(self):
        (self.root / "results" / "predictions.json").write_text(json.dumps(self.metadata))

    def test_local_root_has_metadata_and_urls_without_embedding_images_or_inference(self):
        with mock.patch.object(app, "predict", side_effect=AssertionError("Unexpected inference")):
            with urllib.request.urlopen(self.base + "/") as response:
                html = response.read().decode()
                self.assertEqual(response.headers["Content-Type"], "text/html; charset=utf-8")
        bundle_line = next(line for line in html.splitlines() if line.startswith("const BUNDLE"))
        rendered = json.loads(bundle_line.split("=", 1)[1].strip().removesuffix(";"))
        self.assertEqual(len(rendered["photos"]), 32)
        first = rendered["photos"][0]["variants"][0]
        self.assertEqual(first["image"], f"/api/saved/{self.input_hash}.jpg")
        self.assertEqual(first["species_crops"][0]["image"], f"/api/saved/{self.crop_hash}.jpg")
        self.assertNotIn("data:image/", html)
        self.assertNotIn(str(self.root), html)
        with urllib.request.urlopen(self.base + "/offline_demo.html") as response:
            self.assertEqual(response.read(), self.offline)

    def test_saved_image_endpoint_returns_only_exact_approved_input_and_crop_bytes(self):
        for checksum, expected in ((self.input_hash, self.input_bytes), (self.crop_hash, self.crop_bytes)):
            with self.subTest(checksum=checksum), urllib.request.urlopen(
                    self.base + f"/api/saved/{checksum}.jpg") as response:
                self.assertEqual(response.headers["Content-Type"], "image/jpeg")
                raw = response.read()
                self.assertEqual(raw, expected)
                self.assertEqual(hashlib.sha256(raw).hexdigest(), checksum)
        for invalid in ("../predictions.json", "bad.jpg", "0" * 64 + ".jpg",
                        self.input_hash + ".png", "%2e%2e%2fpredictions.json"):
            with self.subTest(invalid=invalid), self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(self.base + "/api/saved/" + invalid)
            self.assertEqual(error.exception.code, 404)

    def test_changed_saved_bytes_are_rejected_instead_of_paired_with_old_predictions(self):
        (self.root / "results" / "input.jpg").write_bytes(b"changed saved bytes")
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(self.base + f"/api/saved/{self.input_hash}.jpg")
        self.assertEqual(error.exception.code, 409)
        self.assertNotIn(b"changed saved bytes", error.exception.read())

    def test_manifest_paths_and_symlinks_cannot_expose_files_outside_results(self):
        outside = self.root / "private.jpg"
        outside.write_bytes(self.input_bytes)
        self.metadata["photos"][0]["variants"][0]["input_file"] = "results/../private.jpg"
        self.write_metadata()
        with self.assertRaises(ValueError):
            app.saved_bundle()
        self.metadata["photos"][0]["variants"][0]["input_file"] = "results/shortcut.jpg"
        try:
            (self.root / "results" / "shortcut.jpg").symlink_to(outside)
        except OSError:
            self.skipTest("Creating symlinks is not available on this platform")
        self.write_metadata()
        with self.assertRaises(ValueError):
            app.saved_bundle()
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(self.base + f"/api/saved/{self.input_hash}.jpg")
        self.assertEqual(error.exception.code, 409)


if __name__ == "__main__":
    unittest.main()
