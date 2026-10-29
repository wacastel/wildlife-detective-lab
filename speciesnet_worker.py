#!/usr/bin/env python3
"""NDJSON worker; all model logging goes to stderr, never into results."""
from __future__ import annotations

import base64
import contextlib
import hashlib
import io
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent


def main():
    classifier = None
    for line in sys.stdin:
        try:
            request = json.loads(line)
            text = request["image_data"]
            if not isinstance(text, str) or not text.startswith("data:image/") or len(text) > 12_000_000:
                raise ValueError("Expected a crop image under 8 MB")
            raw = base64.b64decode(text.split(",", 1)[1], validate=True)
            with contextlib.redirect_stdout(sys.stderr):
                from PIL import Image
                from speciesnet_adapter import SpeciesClassifier
                if classifier is None:
                    classifier = SpeciesClassifier(ROOT/"models/speciesnet")
                with Image.open(io.BytesIO(raw)) as image:
                    image = image.convert("RGB")
                    if image.width*image.height > 24_000_000:
                        raise ValueError("Crop exceeds 24 megapixels")
                    start = time.perf_counter()
                    prediction = classifier.predict(image, top_k=5)
            prediction["input_sha256"] = hashlib.sha256(raw).hexdigest()
            prediction["elapsed_seconds"] = round(time.perf_counter()-start, 3)
            print(json.dumps(prediction), flush=True)
        except Exception as exc:
            print(json.dumps({"error": f"{type(exc).__name__}: {exc}"}), flush=True)


if __name__ == "__main__":
    main()
