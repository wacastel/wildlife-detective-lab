#!/usr/bin/env python3
"""Loopback-only wildlife image lab. No cloud calls or runtime downloads."""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import webbrowser
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "megadetector_v6.onnx"
_detector = None
_lock = threading.Lock()
MAX_BODY = 12_000_000
SAVED_IMAGE_ID = re.compile(r"([0-9a-f]{64})\.jpg\Z")


def saved_bundle():
    """Use recorded metadata, loading exact saved image bytes only on demand."""
    bundle = json.loads((ROOT / "results" / "predictions.json").read_text())
    files = {}
    if (ROOT / "results").is_symlink():
        raise ValueError("The results folder must not be a symbolic link")
    results_dir = (ROOT / "results").resolve()
    for photo in bundle["photos"]:
        for variant in photo["variants"]:
            for item in (variant, *variant.get("species_crops", [])):
                checksum = item["input_sha256"]
                relative = Path(item["input_file"])
                if (not isinstance(checksum, str)
                        or not re.fullmatch(r"[0-9a-f]{64}", checksum)
                        or relative.is_absolute() or ".." in relative.parts
                        or not relative.parts or relative.parts[0] != "results"
                        or relative.suffix.lower() != ".jpg"):
                    raise ValueError("Invalid recorded image reference")
                candidate = (ROOT / relative).resolve()
                if not candidate.is_relative_to(results_dir):
                    raise ValueError("Recorded image is outside the results folder")
                approved = relative.relative_to("results")
                paths = files.setdefault(checksum, [])
                if approved not in paths:
                    paths.append(approved)
                item["image"] = f"/api/saved/{checksum}.jpg"
    return bundle, files


def _read_saved_file(relative):
    """Open only an approved results path, without following symlink components."""
    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    file_flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    if os.open in os.supports_dir_fd:
        directory = os.open(ROOT / "results", directory_flags)
        try:
            for component in relative.parts[:-1]:
                child = os.open(component, directory_flags, dir_fd=directory)
                os.close(directory)
                directory = child
            fd = os.open(relative.name, file_flags, dir_fd=directory)
        finally:
            os.close(directory)
    else:
        results_dir = (ROOT / "results").resolve()
        candidate = ROOT / "results" / relative
        if not candidate.resolve().is_relative_to(results_dir) or candidate.is_symlink():
            raise ValueError("Invalid saved image path")
        fd = os.open(candidate, file_flags)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > 16 * 1024 * 1024:
            raise ValueError("Invalid saved image file")
        return stream.read(16 * 1024 * 1024 + 1)


def saved_image(name):
    match = SAVED_IMAGE_ID.fullmatch(name)
    if not match:
        raise KeyError("Unknown recorded image")
    checksum = match.group(1)
    _bundle, files = saved_bundle()
    if checksum not in files:
        raise KeyError("Unknown recorded image")
    for relative in files[checksum]:
        try:
            raw = _read_saved_file(relative)
        except (OSError, ValueError):
            continue
        if hashlib.sha256(raw).hexdigest() == checksum:
            return raw
    raise ValueError("Recorded image bytes no longer match their prediction")


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
    source_info = {}
    if payload.get("image_data"):
        from local_photos import decode_photo
        text = payload["image_data"]
        if not isinstance(text, str) or not text.startswith("data:image/"):
            raise ValueError("Choose a supported image")
        try:
            raw = base64.b64decode(text.split(",", 1)[1], validate=True)
        except (ValueError, IndexError) as exc:
            raise ValueError("Invalid image data") from exc
        photo = decode_photo(raw)
        source_info = {"source_type": "upload", "source_sha256": hashlib.sha256(raw).hexdigest()}
    elif isinstance(payload.get("photo_id"), str) and payload["photo_id"].startswith("local_"):
        from local_photos import find_photo
        local = find_photo(payload["photo_id"])
        photo = local.image
        preview = local.preview()
        source_info = {"source_type": "local_folder", "source_name": local.filename,
                       "source_sha256": hashlib.sha256(local.raw).hexdigest(),
                       "source_preview": {"image": data_url(preview),
                                          "width": photo.width, "height": photo.height,
                                          "input_sha256": hashlib.sha256(preview).hexdigest()}}
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
            "input_sha256": hashlib.sha256(raw).hexdigest(), **source_info,
            "detections": detections, "elapsed_seconds": round(elapsed, 3),
            "model_name": "MegaDetectorV6-yolov10-c", "params": params,
            "species_crops": [entry for entry, _, _ in animal_crops(exact, detections)]}


class Handler(BaseHTTPRequestHandler):
    def require_local_host(self):
        # Origin can be absent on same-origin GETs, so also reject rebinding hosts.
        hosts = self.headers.get_all("Host", [])
        allowed = {f"127.0.0.1:{self.server.server_port}",
                   f"localhost:{self.server.server_port}"}
        if self.server.server_port == 80:
            allowed.update({"127.0.0.1", "localhost"})
        if len(hosts) != 1 or hosts[0].lower() not in allowed:
            self.respond(403, {"error": "Open the app using its local URL"})
            return False
        return True

    def respond(self, code, data, content_type="application/json; charset=utf-8"):
        if not isinstance(data, bytes):
            data = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.require_local_host():
            return
        path = urlsplit(self.path).path
        if path.startswith("/api/saved/"):
            try:
                return self.respond(200, saved_image(path.removeprefix("/api/saved/")), "image/jpeg")
            except KeyError:
                return self.respond(404, {"error": "Unknown recorded image"})
            except (ValueError, TypeError, OSError):
                return self.respond(409, {"error": "This saved image is unavailable or no longer matches its recorded result. Rebuild the saved examples."})
        if path in ("/api/photos",) or path.startswith("/api/photos/"):
            origin = self.headers.get("Origin")
            own_origins = {f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}"}
            if (origin and origin not in own_origins) or self.headers.get("Sec-Fetch-Site") == "cross-site":
                return self.respond(403, {"error": "Open the app using its local URL"})
            try:
                from local_photos import catalog, find_photo
                if path == "/api/photos":
                    return self.respond(200, catalog())
                photo = find_photo(path.removeprefix("/api/photos/"))
                return self.respond(200, photo.preview(), "image/jpeg")
            except (ValueError, OSError):
                return self.respond(404, {"error": "This photo is unavailable. Refresh your photos and choose it again."})
        if path in ("/", "/index.html"):
            try:
                from build_demo import render_html
                bundle, _files = saved_bundle()
                return self.respond(200, render_html(bundle).encode("utf-8"), "text/html; charset=utf-8")
            except (ValueError, KeyError, TypeError, OSError, RuntimeError):
                return self.respond(503, {"error": "Saved examples are unavailable or invalid. Rebuild the saved activity, or open offline_demo.html directly."})
        elif path == "/offline_demo.html":
            self.respond(200, (ROOT / "offline_demo.html").read_bytes(), "text/html; charset=utf-8")
        elif path == "/api/status":
            self.respond(200, status())
        elif path == "/favicon.ico":
            self.respond(204, b"", "image/x-icon")
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if not self.require_local_host():
            return
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
