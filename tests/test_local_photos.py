"""Local-folder behavior and boundaries, with generated photos only."""
import base64
import hashlib
import http.client
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
import local_photos


class QuietHandler(app.Handler):
    def log_message(self, *_args):
        pass


class LocalPhotoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name) / "photos"
        self.folder.mkdir()

    def write_photo(self, name="garden.jpg", color="red"):
        path = self.folder / name
        Image.new("RGB", (120, 80), color).save(path)
        return path

    def test_catalog_ids_track_content_and_preview_has_no_predictions(self):
        path = self.write_photo()
        first = local_photos.catalog(self.folder)
        self.assertEqual(first["skipped"], [])
        item = first["photos"][0]
        self.assertEqual(item["result_type"], "local_unanalyzed")
        self.assertEqual(item["source_sha256"], hashlib.sha256(path.read_bytes()).hexdigest())
        self.assertNotIn("detections", item)
        self.assertNotIn(str(self.folder), json.dumps(first))
        self.assertEqual(item["id"], local_photos.catalog(self.folder)["photos"][0]["id"])
        self.assertEqual(item["image_url"], "/api/photos/" + item["id"])

        self.write_photo(color="blue")
        newer = local_photos.catalog(self.folder)["photos"][0]
        self.assertNotEqual(item["id"], newer["id"])
        with self.assertRaisesRegex(local_photos.PhotoError, "changed or was removed"):
            local_photos.find_photo(item["id"], self.folder)
        path.unlink()
        self.assertEqual(local_photos.catalog(self.folder)["photos"], [])

    def test_phone_jpeg_preview_uses_primary_image_orientation_and_removes_exif(self):
        exif = Image.Exif()
        exif[274] = 6
        exif[270] = "Private fixture metadata"
        path = self.folder / "phone.jpeg"
        Image.new("RGB", (120, 80), "red").save(
            path, format="MPO", save_all=True,
            append_images=[Image.new("RGB", (120, 80), "blue")], exif=exif)
        item = local_photos.catalog(self.folder)["photos"][0]
        photo = local_photos.find_photo(item["id"], self.folder)
        with Image.open(io.BytesIO(photo.preview())) as preview:
            self.assertEqual(preview.format, "JPEG")
            self.assertEqual(preview.size, (80, 120))
            self.assertEqual(dict(preview.getexif()), {})
            red, _green, blue = preview.getpixel((40, 60))
            self.assertGreater(red, 240)
            self.assertLess(blue, 15)

    def test_bad_files_report_reasons_without_hiding_valid_photos(self):
        self.write_photo()
        (self.folder / "broken.jpg").write_bytes(b"not an image")
        with (self.folder / "too-large.jpg").open("wb") as stream:
            stream.truncate(local_photos.MAX_PHOTO_BYTES + 1)
        Image.new("1", (6001, 4000)).save(self.folder / "too-many-pixels.png")
        Image.new("RGB", (12, 8)).save(self.folder / "unsupported.gif")
        result = local_photos.catalog(self.folder)
        self.assertEqual(len(result["photos"]), 1)
        skipped = {entry["filename"]: entry["reason"] for entry in result["skipped"]}
        self.assertIn("could not be read", skipped["broken.jpg"])
        self.assertIn("8 MiB", skipped["too-large.jpg"])
        self.assertIn("24 megapixels", skipped["too-many-pixels.png"])
        self.assertIn("Unsupported file type", skipped["unsupported.gif"])

    def test_symlinks_and_path_ids_cannot_escape_the_photo_folder(self):
        outside = Path(self.temp.name) / "outside.jpg"
        Image.new("RGB", (12, 8), "blue").save(outside)
        try:
            (self.folder / "shortcut.jpg").symlink_to(outside)
        except OSError:
            self.skipTest("Creating symlinks is not available on this platform")
        result = local_photos.catalog(self.folder)
        self.assertEqual(result["photos"], [])
        self.assertIn("symbolic links", result["skipped"][0]["reason"])
        for invalid in ("../outside.jpg", str(outside), "local_../../outside.jpg"):
            with self.subTest(invalid=invalid), self.assertRaises(local_photos.PhotoError):
                local_photos.find_photo(invalid, self.folder)
        alias = Path(self.temp.name) / "folder-shortcut"
        alias.symlink_to(self.folder, target_is_directory=True)
        self.assertEqual(local_photos.catalog(alias)["photos"], [])
        self.assertIn("regular folder", local_photos.catalog(alias)["skipped"][0]["reason"])

    def test_predict_reads_selected_local_photo_and_records_exact_input_hash(self):
        self.write_photo()
        item = local_photos.catalog(self.folder)["photos"][0]
        seen = []

        class Detector:
            def __init__(self, _path):
                pass

            def predict(self, image, score_floor):
                seen.append(image.getpixel((60, 40)))
                return []

        with mock.patch.object(local_photos, "PHOTO_DIR", self.folder), \
                mock.patch.object(app, "_detector", None), \
                mock.patch("detector.AnimalDetector", Detector):
            prediction = app.predict({"photo_id": item["id"], "grayscale": True})
        self.assertLessEqual(max(seen[0]) - min(seen[0]), 2)
        self.assertEqual(prediction["source_type"], "local_folder")
        self.assertEqual(prediction["source_name"], "garden.jpg")
        self.assertEqual(prediction["source_sha256"], item["source_sha256"])
        exact_input = base64.b64decode(prediction["image"].split(",", 1)[1])
        self.assertEqual(prediction["input_sha256"], hashlib.sha256(exact_input).hexdigest())
        # The source snapshot remains usable after removal, without a live file URL.
        (self.folder / "garden.jpg").unlink()
        preview = prediction["source_preview"]
        preview_bytes = base64.b64decode(preview["image"].split(",", 1)[1])
        self.assertEqual(preview["input_sha256"], hashlib.sha256(preview_bytes).hexdigest())
        self.assertNotEqual(preview["input_sha256"], prediction["input_sha256"])
        with Image.open(io.BytesIO(preview_bytes)) as source:
            self.assertEqual(source.size, (preview["width"], preview["height"]))
            red, _green, blue = source.getpixel((60, 40))
            self.assertGreater(red, 240)
            self.assertLess(blue, 15)

    def test_http_catalog_preview_and_origin_boundaries(self):
        self.write_photo()
        with mock.patch.object(local_photos, "PHOTO_DIR", self.folder):
            server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_port}"
            try:
                with urllib.request.urlopen(base + "/api/photos") as response:
                    result = json.load(response)
                    self.assertEqual(response.headers["Cache-Control"], "no-store")
                with urllib.request.urlopen(base + result["photos"][0]["image_url"]) as response:
                    self.assertEqual(response.headers["Content-Type"], "image/jpeg")
                    self.assertEqual(response.headers["Cross-Origin-Resource-Policy"], "same-origin")
                    with Image.open(io.BytesIO(response.read())) as image:
                        self.assertEqual(image.size, (120, 80))
                for invalid in ("/api/photos/local_bad", "/api/photos/../../outside.jpg"):
                    with self.subTest(invalid=invalid), self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(base + invalid)
                    self.assertEqual(error.exception.code, 404)
                for headers in ({"Origin": "https://example.com"}, {"Sec-Fetch-Site": "cross-site"}):
                    request = urllib.request.Request(base + "/api/photos", headers=headers)
                    with self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(request)
                    self.assertEqual(error.exception.code, 403)
                # Browser same-origin GETs can omit Origin; Host must still be local.
                for method, path in (("GET", "/api/photos"), ("GET", "/"),
                                     ("POST", "/api/predict"), ("POST", "/api/classify")):
                    for host in (None, f"attacker.example:{server.server_port}",
                                 "127.0.0.1", f"localhost:{server.server_port + 1}"):
                        with self.subTest(method=method, path=path, host=host):
                            connection = http.client.HTTPConnection("127.0.0.1", server.server_port)
                            try:
                                connection.putrequest(method, path, skip_host=True)
                                if host is not None:
                                    connection.putheader("Host", host)
                                if method == "POST":
                                    connection.putheader("Content-Length", "2")
                                connection.endheaders(b"{}" if method == "POST" else None)
                                denied = connection.getresponse()
                                self.assertEqual(denied.status, 403)
                                self.assertEqual(json.loads(denied.read())["error"],
                                                 "Open the app using its local URL")
                            finally:
                                connection.close()
                with urllib.request.urlopen(urllib.request.Request(
                        base + "/api/photos", headers={"Host": f"localhost:{server.server_port}"})) as response:
                    self.assertEqual(response.status, 200)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
