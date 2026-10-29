"""Exact MegaDetector animal crops passed to the separate species classifier."""
from __future__ import annotations

import hashlib

from image_lab import data_url, encode_input

CROP_SCORE_FLOOR = 0.05
MAX_CROPS = 5


def animal_crops(image, detections):
    """Yield metadata and exact decoded JPEG for up to five animal candidates.

    Coordinates are those from this detector, not human annotations. A wrong
    box therefore leads to a wrong or incomplete classifier input. Tight
    crops have no added padding, following SpeciesNet's crop-model usage.
    """
    count = 0
    for index, det in enumerate(detections):
        if det["category"] != "animal" or det["score"] < CROP_SCORE_FLOOR:
            continue
        x, y, w, h = det["bbox"]
        left = max(0, min(image.width-1, int(x*image.width)))
        top = max(0, min(image.height-1, int(y*image.height)))
        right = min(image.width, left+max(1, int(w*image.width)))
        bottom = min(image.height, top+max(1, int(h*image.height)))
        crop = image.crop((left, top, right, bottom))
        raw, exact = encode_input(crop)
        entry = {"detection_index": index, "detector_score": det["score"],
                 "bbox": det["bbox"], "pixel_box": [left, top, right, bottom],
                 "image": data_url(raw), "width": exact.width, "height": exact.height,
                 "input_sha256": hashlib.sha256(raw).hexdigest(), "prediction": None}
        yield entry, raw, exact
        count += 1
        if count >= MAX_CROPS:
            break
