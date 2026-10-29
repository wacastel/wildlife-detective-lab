"""Deterministic teaching edits; these are not camera/sensor simulations."""
from __future__ import annotations

import base64
import io
import math

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = 24_000_000

DEFAULTS = dict(brightness=1.0, blur=0.0, resolution=1280,
                scale=1.0, occlusion=0.0, grayscale=False)

PRESETS = [
    ("clear", "Source photo", "The original source may already be difficult. Which clues are visible before we add any teaching edits?", {}),
    ("dark", "Lights down", "Pixel values are reduced to 10%. This is not a real night-camera simulation.", {"brightness": 0.10}),
    ("blur", "Out of focus", "A Gaussian blur mixes nearby details (radius 12 pixels).", {"blur": 12}),
    ("lowres", "Fewer pixels", "Shrink to 32 pixels on the long edge, then enlarge. Enlarging cannot restore the lost details.", {"resolution": 32}),
    ("small", "Tiny in the frame", "The entire scene is shrunk onto a gray canvas. A toy example of fewer animal pixels, not a real change of camera distance.", {"scale": 0.20}),
    ("hidden", "Partly hidden", "A gray strip hides 30% of the picture width. This tests obstruction, not realistic camouflage.", {"occlusion": 0.30}),
    ("grayscale", "Remove color", "Only ordinary RGB color is removed. This is NOT infrared or thermal imaging.", {"grayscale": True}),
    ("combo", "Double challenge", "Change two clues: brightness 15% and resolution 48 pixels. Compare with the single changes.", {"brightness": 0.15, "resolution": 48}),
]


def clean_params(values: dict | None = None) -> dict:
    values = values or {}
    out = dict(DEFAULTS)
    limits = {"brightness": (0.02, 2.0), "blur": (0.0, 25.0),
              "resolution": (16, 1280), "scale": (0.10, 1.0),
              "occlusion": (0.0, 0.80)}
    for key, (low, high) in limits.items():
        value = float(values.get(key, out[key]))
        if not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f"{key} must be between {low} and {high}")
        out[key] = int(value) if key == "resolution" else value
    out["grayscale"] = bool(values.get("grayscale", False))
    return out


def load_photo(path_or_file) -> Image.Image:
    with Image.open(path_or_file) as im:
        if im.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Please choose a JPEG, PNG, or WebP photo")
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        return im.copy()


def transform(image: Image.Image, values: dict | None = None) -> tuple[Image.Image, dict]:
    p = clean_params(values)
    im = image.convert("RGB").copy()
    width, height = im.size
    if p["grayscale"]:
        im = ImageOps.grayscale(im).convert("RGB")
    if p["resolution"] < max(im.size):
        ratio = p["resolution"] / max(im.size)
        small = (max(1, round(width * ratio)), max(1, round(height * ratio)))
        im = im.resize(small, Image.Resampling.BOX).resize(im.size, Image.Resampling.NEAREST)
    if p["blur"]:
        im = im.filter(ImageFilter.GaussianBlur(p["blur"]))
    if p["scale"] < 1:
        small = im.resize((max(1, round(width*p["scale"])), max(1, round(height*p["scale"]))), Image.Resampling.LANCZOS)
        im = Image.new("RGB", (width, height), (114, 114, 114))
        im.paste(small, ((width-small.width)//2, (height-small.height)//2))
    if p["occlusion"]:
        strip = round(width*p["occlusion"])
        left = (width-strip)//2
        ImageDraw.Draw(im).rectangle((left, 0, left+strip, height), fill=(83, 101, 88))
    if p["brightness"] != 1:
        im = ImageEnhance.Brightness(im).enhance(p["brightness"])
    return im, p


def encode_input(image: Image.Image) -> tuple[bytes, Image.Image]:
    """Predict on the decoded exact bytes we show/save, avoiding JPEG mismatch."""
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=92, subsampling=0)
    data = buffer.getvalue()
    with Image.open(io.BytesIO(data)) as im:
        decoded = im.convert("RGB").copy()
    return data, decoded


def data_url(data: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
