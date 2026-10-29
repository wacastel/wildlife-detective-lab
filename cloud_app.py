#!/usr/bin/env python3
"""Cloud Run entry point; private folders remain exclusive to the local app."""
from __future__ import annotations

import base64
from http.server import ThreadingHTTPServer
import json
import os
import re
import threading
from urllib.parse import urlsplit

import app

MODE = os.environ.get("WILDLIFE_MODE", "live")
_inference_slots = threading.BoundedSemaphore(2)
_html_lock = threading.Lock()
_html = None


def cloud_status():
    if MODE == "live":
        result = app.status()
    else:
        result = {"available": False, "species_available": False, "missing": []}
    result.update({"hosting_mode": "cloud", "execution_location": "Google Cloud",
                   "photo_storage": "memory_only", "allow_folder_photos": False,
                   "reason": ("Ready: new predictions run on Google Cloud. Uploaded photos are processed in memory and are not saved by this app."
                              if result["available"] else
                              "This hosted edition uses genuine saved examples; new photo analysis is unavailable."),
                   "species_reason": ("SpeciesNet runs on Google Cloud. Crop images are processed in memory."
                                      if result["species_available"] else
                                      "Saved SpeciesNet classifications remain available.")})
    return result


def page():
    global _html
    with _html_lock:
        if _html is None:
            from build_demo import render_html
            bundle, _files = app.saved_bundle()
            bundle["hosting_mode"] = "cloud"
            _html = render_html(bundle).encode("utf-8")
    return _html


class CloudHandler(app.Handler):
    def log_message(self, format, *args):
        # Never log request bodies, photo names, image bytes, or query strings.
        print(json.dumps({"severity": "INFO", "method": self.command,
                          "path": urlsplit(self.path).path,
                          "status": str(args[1]) if len(args) > 1 else ""}), flush=True)

    def respond(self, code, data, content_type="application/json; charset=utf-8"):
        if not isinstance(data, bytes):
            data = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
        if code == 429:
            self.send_header("Retry-After", "5")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def allowed_hosts(self):
        hosts = set()
        for value in os.environ.get("WILDLIFE_PUBLIC_HOST", "").split(","):
            value = value.strip().lower()
            if re.fullmatch(r"[a-z0-9][a-z0-9.-]*(?::[0-9]{1,5})?", value):
                hosts.add(value)
        return hosts

    def require_cloud_host(self):
        hosts = self.headers.get_all("Host", [])
        if len(hosts) != 1 or hosts[0].lower() not in self.allowed_hosts():
            self.respond(403, {"error": "Open the app using its published address."})
            return False
        return True

    def same_origin(self):
        origins = self.headers.get_all("Origin", [])
        scheme = "http" if os.environ.get("WILDLIFE_ALLOW_HTTP") == "1" else "https"
        allowed = {f"{scheme}://{host}" for host in self.allowed_hosts()}
        return (len(origins) == 1 and origins[0] in allowed
                and self.headers.get("Sec-Fetch-Site") != "cross-site")

    def offline_export(self):
        # Cloud Run limits non-streaming HTTP/1 responses to 32 MiB. The fully
        # embedded teaching export is larger, so stream a fixed approved file.
        try:
            stream = (app.ROOT / "offline_demo.html").open("rb")
        except OSError:
            return self.respond(503, {"error": "The offline export is unavailable."})
        with stream:
            self.protocol_version = "HTTP/1.1"
            self.close_connection = True
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="offline_demo.html"')
            self.send_header("Transfer-Encoding", "chunked")
            self.send_header("Connection", "close")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
            self.end_headers()
            try:
                for chunk in iter(lambda: stream.read(64 * 1024), b""):
                    self.wfile.write(f"{len(chunk):x}\r\n".encode("ascii"))
                    self.wfile.write(chunk)
                    self.wfile.write(b"\r\n")
                    self.wfile.flush()
                self.wfile.write(b"0\r\n\r\n")
            except (BrokenPipeError, ConnectionResetError):
                pass

    def do_GET(self):
        path = urlsplit(self.path).path
        # Only this constant readiness response works before hostname setup.
        if path == "/healthz":
            return self.respond(200, {"status": "ok"})
        if not self.require_cloud_host():
            return
        if path in ("/", "/index.html"):
            try:
                return self.respond(200, page(), "text/html; charset=utf-8")
            except (ValueError, KeyError, TypeError, OSError, RuntimeError):
                return self.respond(503, {"error": "The saved teaching activity is unavailable."})
        if path == "/api/status":
            return self.respond(200, cloud_status())
        if path == "/api/photos":
            return self.respond(200, {"photos": [], "skipped": [], "folder": None,
                                      "hosting_mode": "cloud", "allow_folder_photos": False})
        if path.startswith("/api/saved/"):
            try:
                return self.respond(200, app.saved_image(path.removeprefix("/api/saved/")), "image/jpeg")
            except KeyError:
                return self.respond(404, {"error": "Unknown recorded image"})
            except (ValueError, TypeError, OSError):
                return self.respond(409, {"error": "The saved image is unavailable or does not match its recorded result."})
        if path == "/offline_demo.html":
            return self.offline_export()
        if path == "/favicon.ico":
            return self.respond(204, b"", "image/x-icon")
        return self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if not self.require_cloud_host():
            return
        if self.path not in ("/api/predict", "/api/classify"):
            return self.respond(404, {"error": "Not found"})
        if not self.same_origin():
            return self.respond(403, {"error": "Use the photo controls on this app's published page."})
        if MODE != "live":
            return self.respond(503, {"error": "This edition offers saved examples only."})
        if self.headers.get_content_type() != "application/json":
            return self.respond(415, {"error": "Expected a JSON photo request."})
        if not _inference_slots.acquire(blocking=False):
            return self.respond(429, {"error": "The models are helping other students. Please try again in a few seconds."})
        try:
            lengths = self.headers.get_all("Content-Length", [])
            if len(lengths) != 1:
                raise ValueError("Expected one photo request length.")
            length = int(lengths[0])
            if not 0 < length <= app.MAX_BODY:
                raise ValueError("Choose a photo under 8 MiB.")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Expected a photo request object.")
            if str(payload.get("photo_id", "")).startswith("local_"):
                raise ValueError("Local-folder photos are available only in the laptop app.")
            if self.path == "/api/predict":
                if not cloud_status()["available"]:
                    return self.respond(503, {"error": "The detector is unavailable; saved examples remain available."})
                result = app.predict(payload)
            else:
                from local_photos import decode_photo
                from species_bridge import classify_crop
                text = payload.get("image_data")
                if not isinstance(text, str) or not text.startswith("data:image/"):
                    raise ValueError("Select an animal crop first.")
                try:
                    raw = base64.b64decode(text.split(",", 1)[1], validate=True)
                except (ValueError, IndexError) as exc:
                    raise ValueError("Invalid crop image data.") from exc
                decode_photo(raw)  # Validate format/8 MiB/24 MP before worker decode.
                if not cloud_status()["species_available"]:
                    return self.respond(503, {"error": "The classifier is unavailable; saved classifications remain available."})
                result = classify_crop(text)
            return self.respond(200, result)
        except (ValueError, KeyError, TypeError, UnicodeError) as exc:
            return self.respond(400, {"error": str(exc)})
        except Exception:
            return self.respond(500, {"error": "The model could not complete this photo. Please try another photo."})
        finally:
            _inference_slots.release()


def main():
    if MODE not in {"live", "recorded"}:
        raise SystemExit("WILDLIFE_MODE must be live or recorded")
    server = ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), CloudHandler)
    server.daemon_threads = True
    print(json.dumps({"severity": "INFO", "message": "Wildlife teaching service ready", "mode": MODE}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
