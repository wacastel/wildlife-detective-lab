#!/usr/bin/env python3
"""Loopback-only wildlife image lab. No cloud calls or runtime downloads."""
from __future__ import annotations

import argparse
import base64
import importlib.util
import io
import json
from pathlib import Path
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import webbrowser

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "megadetector_v6.onnx"
_detector = None
_lock = threading.Lock()
MAX_BODY = 12_000_000


def status():
    missing = [x for x in ("PIL", "numpy", "onnxruntime")
               if importlib.util.find_spec(x) is None]
    available = MODEL_PATH.is_file() and not missing
    from species_bridge import species_status
    species = species_status()
    return {"available": available, "model_name": "MegaDetectorV6-yolov10-c",
            "species_available": species["available"], "species_reason": species["reason"],
            "reason": ("Ready: inference runs on this laptop." if available else
                       "Live mode needs the bundled model and packages from requirements.txt. Saved results still work."),
            "missing": missing}


def predict(payload):
    global _detector
    from image_lab import data_url, encode_input, load_photo, transform
    from detector import AnimalDetector
    from crop_pipeline import animal_crops
    if payload.get("image_data"):
        text = payload["image_data"]
        if not isinstance(text, str) or not text.startswith("data:image/"):
            raise ValueError("Choose a supported image")
        try:
            raw = base64.b64decode(text.split(",", 1)[1], validate=True)
        except (ValueError, IndexError) as exc:
            raise ValueError("Invalid image data") from exc
        photo = load_photo(io.BytesIO(raw))
    else:
        sources = json.loads((ROOT / "assets" / "photos.json").read_text())
        source = next((x for x in sources if x["id"] == payload.get("photo_id")), None)
        if source is None:
            raise ValueError("Choose one of the example photos")
        photo = load_photo(ROOT / "assets" / source["filename"])
    transformed, params = transform(photo, payload)
    raw, exact = encode_input(transformed)
    with _lock:
        if _detector is None:
            _detector = AnimalDetector(MODEL_PATH)
        start = time.perf_counter()
        detections = _detector.predict(exact, score_floor=0.01)
        elapsed = time.perf_counter()-start
    return {"image": data_url(raw), "width": exact.width, "height": exact.height,
            "detections": detections, "elapsed_seconds": round(elapsed, 3),
            "model_name": "MegaDetectorV6-yolov10-c", "params": params,
            "species_crops": [entry for entry, _, _ in animal_crops(exact, detections)]}


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, data, content_type="application/json; charset=utf-8"):
        if not isinstance(data, bytes):
            data = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html", "/offline_demo.html"):
            self.respond(200, (ROOT / "offline_demo.html").read_bytes(), "text/html; charset=utf-8")
        elif self.path == "/api/status":
            self.respond(200, status())
        elif self.path == "/favicon.ico":
            self.respond(204, b"", "image/x-icon")
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path not in ("/api/predict", "/api/classify"):
            return self.respond(404, {"error": "Not found"})
        # Local browser UI only; do not accept cross-site requests.
        origin = self.headers.get("Origin")
        own_origins = {f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}"}
        if origin and origin not in own_origins:
            return self.respond(403, {"error": "Open the app using its local URL"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY:
                raise ValueError("Choose a photo under 8 MB")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Expected an object")
            if self.path == "/api/predict":
                if not status()["available"]:
                    return self.respond(503, {"error": status()["reason"]})
                result = predict(payload)
            else:
                from species_bridge import classify_crop, species_status
                species = species_status()
                if not species["available"]:
                    return self.respond(503, {"error": species["reason"]})
                image_data = payload.get("image_data")
                if not isinstance(image_data, str) or not image_data.startswith("data:image/"):
                    raise ValueError("Select a detected crop first")
                result = classify_crop(image_data)
        except (ValueError, KeyError, TypeError, OSError) as exc:
            return self.respond(400, {"error": str(exc)})
        except Exception as exc:
            return self.respond(500, {"error": f"Detector could not run: {type(exc).__name__}: {exc}"})
        self.respond(200, result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://127.0.0.1:{server.server_port}"
    print(f"Wildlife AI lab: {url}\nCtrl+C stops the app.", flush=True)
    print(status()["reason"], flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLab closed.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
