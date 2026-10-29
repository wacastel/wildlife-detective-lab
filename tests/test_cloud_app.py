"""The hosted entry point exposes only student-facing images and APIs."""
import base64
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest import mock

from PIL import Image

import app
import cloud_app


class QuietCloudHandler(cloud_app.CloudHandler):
    def log_message(self, *args):
        pass


class CloudHTTPTests(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietCloudHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.host = f"127.0.0.1:{self.server.server_port}"
        self.origin = "http://" + self.host
        patch = mock.patch.dict(os.environ, {"WILDLIFE_PUBLIC_HOST": self.host,
                                            "WILDLIFE_ALLOW_HTTP": "1"})
        patch.start()
        self.addCleanup(patch.stop)
        mode = mock.patch.object(cloud_app, "MODE", "live")
        mode.start()
        self.addCleanup(mode.stop)
        self.addCleanup(self.stop)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method, path, payload=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        extra = {"Content-Type": "application/json", "Origin": self.origin}
        if headers:
            extra.update(headers)
        body = json.dumps(payload).encode() if payload is not None else None
        connection.request(method, path, body, headers=extra)
        response = connection.getresponse()
        status, meta, raw = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return status, meta, json.loads(raw) if raw else None

    def test_folder_catalog_is_empty_and_private_files_have_no_routes(self):
        with mock.patch("local_photos.catalog", side_effect=AssertionError("Private folder read")), \
                mock.patch("local_photos.find_photo", side_effect=AssertionError("Private photo read")):
            code, _, data = self.request("GET", "/api/photos")
            self.assertEqual(code, 200)
            self.assertEqual(data["photos"], [])
            self.assertFalse(data["allow_folder_photos"])
            for path in ("/api/photos/local_" + "a" * 64, "/user_photos/private.jpg",
                         "/models/speciesnet/model.pt", "/.env", "/../private.jpg"):
                self.assertEqual(self.request("GET", path)[0], 404)
            with mock.patch.object(app, "predict", side_effect=AssertionError("Unexpected inference")):
                code, _, _ = self.request("POST", "/api/predict", {"photo_id": "local_" + "a" * 64})
                self.assertEqual(code, 400)

    def test_host_and_origin_checks_block_cross_site_requests(self):
        self.assertEqual(self.request("GET", "/api/photos", headers={"Host": "foreign.example"})[0], 403)
        for headers in ({"Origin": "https://foreign.example"}, {"Origin": ""},
                        {"Sec-Fetch-Site": "cross-site"}):
            self.assertEqual(self.request("POST", "/api/predict", {}, headers)[0], 403)
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        connection.putrequest("GET", "/api/photos", skip_host=True)
        connection.putheader("Host", self.host)
        connection.putheader("Host", self.host)
        connection.endheaders()
        response = connection.getresponse()
        self.assertEqual(response.status, 403)
        response.read()
        connection.close()
        with mock.patch.dict(os.environ, {"WILDLIFE_PUBLIC_HOST": ""}):
            self.assertEqual(self.request("GET", "/healthz")[0], 200)
            self.assertEqual(self.request("GET", "/api/photos")[0], 403)

    def test_upload_and_crop_requests_delegate_without_private_folder_access(self):
        encoded = io.BytesIO()
        Image.new("RGB", (12, 8), "orange").save(encoded, format="JPEG")
        image = "data:image/jpeg;base64," + base64.b64encode(encoded.getvalue()).decode()
        ready = {"available": True, "species_available": True}
        with mock.patch.object(cloud_app, "cloud_status", return_value=ready), \
                mock.patch.object(app, "predict", return_value={"detections": []}) as predict, \
                mock.patch("species_bridge.classify_crop", return_value={"topk": []}) as classify:
            self.assertEqual(self.request("POST", "/api/predict", {"image_data": image})[0], 200)
            predict.assert_called_once_with({"image_data": image})
            self.assertEqual(self.request("POST", "/api/classify", {"image_data": image})[0], 200)
            classify.assert_called_once_with(image)
            self.assertEqual(self.request("POST", "/api/classify", {"image_data": "data:image/jpeg;base64,bad!"})[0], 400)
            self.assertEqual(self.request("POST", "/api/predict", {}, {"Content-Type": "text/plain"})[0], 415)
            self.assertEqual(self.request("POST", "/api/predict", {}, {"Content-Length": str(app.MAX_BODY + 1)})[0], 400)

    def test_busy_and_internal_failures_do_not_expose_paths_or_accept_unbounded_work(self):
        for _ in range(2):
            self.assertTrue(cloud_app._inference_slots.acquire(blocking=False))
        try:
            code, headers, _ = self.request("POST", "/api/predict", {})
            self.assertEqual(code, 429)
            self.assertEqual(headers["Retry-After"], "5")
        finally:
            cloud_app._inference_slots.release()
            cloud_app._inference_slots.release()
        with mock.patch.object(cloud_app, "cloud_status", return_value={"available": True}), \
                mock.patch.object(app, "predict", side_effect=RuntimeError("/private/credentials")):
            code, _, data = self.request("POST", "/api/predict", {})
            self.assertEqual(code, 500)
            self.assertNotIn("private", json.dumps(data))
        self.assertTrue(cloud_app._inference_slots.acquire(blocking=False))
        cloud_app._inference_slots.release()

    def test_recorded_mode_stays_read_only_and_cloud_status_is_explicit(self):
        with mock.patch.object(cloud_app, "MODE", "recorded"), \
                mock.patch.object(app, "status", side_effect=AssertionError("Live status probed")):
            code, _, data = self.request("GET", "/api/status")
            self.assertEqual(code, 200)
            self.assertEqual(data["hosting_mode"], "cloud")
            self.assertFalse(data["available"])
            self.assertEqual(data["photo_storage"], "memory_only")
            self.assertEqual(self.request("POST", "/api/predict", {})[0], 503)

    def test_large_offline_export_uses_chunked_streaming(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            content = b"<html>" + b"x" * (130 * 1024) + b"</html>"
            (root / "offline_demo.html").write_bytes(content)
            with mock.patch.object(app, "ROOT", root):
                connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
                connection.request("GET", "/offline_demo.html")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(response.getheader("Transfer-Encoding"), "chunked")
                self.assertIsNone(response.getheader("Content-Length"))
                self.assertEqual(response.read(), content)
                connection.close()


if __name__ == "__main__":
    unittest.main()
