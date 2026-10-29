#!/usr/bin/env python3
"""Regenerate exact inputs, genuine predictions, and self-contained offline UI."""
from __future__ import annotations

import argparse
import base64
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import platform
import time

import numpy as np
import PIL
from PIL import Image, ImageOps

from detector import AnimalDetector, INPUT_SIZE, MODEL_ID
from image_lab import PRESETS, data_url, encode_input, load_photo, transform
from crop_pipeline import animal_crops, CROP_SCORE_FLOOR, MAX_CROPS
from species_bridge import classify_crop, species_status

ROOT = Path(__file__).resolve().parent


def load_template():
    """Inline editable lesson sources so the exported activity stays offline."""
    template = (ROOT / "ui_template.html").read_text()
    for marker, filename in {
        "__LESSON_HTML__": "lesson_content.html",
        "__LESSON_CSS__": "lesson_styles.css",
        "__LESSON_JS__": "lesson_interactions.js",
        "__LAB_JS__": "lab_interactions.js",
        "__TABS_CSS__": "app_tabs.css",
        "__CAMERA_TRAP_HTML__": "camera_trap_content.html",
        "__CAMERA_TRAP_CSS__": "camera_trap_styles.css",
        "__CAMERA_TRAP_JS__": "camera_trap_interactions.js",
        "__INFERENCE_CSS__": "inference_walkthrough.css",
    }.items():
        if template.count(marker) != 1:
            raise RuntimeError(f"UI must contain exactly one {marker} placeholder")
        template = template.replace(marker, (ROOT / filename).read_text())
    equipment = json.loads((ROOT / "assets/camera_trap_equipment.json").read_text())
    photo = (ROOT / "assets/camera_trap_mounted.jpg").read_bytes()
    if hashlib.sha256(photo).hexdigest() != equipment["prepared_sha256"]:
        raise ValueError("Camera-trap equipment photo no longer matches its credit record")
    if template.count("__CAMERA_TRAP_PHOTO__") != 1:
        raise RuntimeError("Equipment lesson must contain exactly one photo placeholder")
    template = template.replace("__CAMERA_TRAP_PHOTO__", data_url(photo))
    return template


def lesson_letterbox(variant):
    """Show the adapter's exact RGB resize/padding as a lossless teaching preview."""
    relative = Path(variant["input_file"])
    if relative.is_absolute() or ".." in relative.parts or relative.parts[:1] != ("results",):
        raise ValueError("Lesson preview must use a saved results image")
    path = (ROOT / relative).resolve()
    if not path.is_relative_to((ROOT / "results").resolve()):
        raise ValueError("Lesson preview is outside the results folder")
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != variant["input_sha256"]:
        raise ValueError("Lesson source no longer matches its recorded prediction")
    with Image.open(io.BytesIO(raw)) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
    scale = min(INPUT_SIZE / image.width, INPUT_SIZE / image.height)
    width, height = max(1, round(image.width * scale)), max(1, round(image.height * scale))
    canvas = Image.new("RGB", (INPUT_SIZE, INPUT_SIZE), (114, 114, 114))
    canvas.paste(image.resize((width, height), Image.Resampling.BILINEAR),
                 ((INPUT_SIZE - width) // 2, (INPUT_SIZE - height) // 2))
    encoded = io.BytesIO()
    canvas.save(encoded, format="PNG")
    return {"lesson_letterbox": "data:image/png;base64," + base64.b64encode(encoded.getvalue()).decode(),
            "lesson_letterbox_sha256": hashlib.sha256(canvas.tobytes()).hexdigest()}


def with_lesson_previews(bundle):
    prepared = dict(bundle)
    if "photos" not in bundle:
        return prepared
    prepared["photos"] = []
    for photo in bundle["photos"]:
        if photo.get("id") not in {"deer_4", "raccoon_trap_1", "coyote_3"}:
            prepared["photos"].append(photo)
            continue
        prepared["photos"].append({**photo, "variants": [
            {**variant, **lesson_letterbox(variant)} if variant.get("id") == "clear" else variant
            for variant in photo["variants"]]})
    return prepared


def render_html(bundle):
    template = load_template()
    encoded = json.dumps(with_lesson_previews(bundle), ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    if template.count("__BUNDLE_JSON__") != 1:
        raise RuntimeError("UI must contain exactly one bundle placeholder")
    return template.replace("__BUNDLE_JSON__", encoded)


def render_bundle(bundle):
    (ROOT/"offline_demo.html").write_text(render_html(bundle))


def render_only():
    bundle = json.loads((ROOT/"results/predictions.json").read_text())
    for photo in bundle["photos"]:
        for variant in photo["variants"]:
            raw = (ROOT/variant["input_file"]).read_bytes()
            if hashlib.sha256(raw).hexdigest() != variant["input_sha256"]:
                raise ValueError("Recorded image no longer matches its predictions")
            variant["image"] = data_url(raw)
            for crop in variant.get("species_crops", []):
                raw = (ROOT/crop["input_file"]).read_bytes()
                if hashlib.sha256(raw).hexdigest() != crop["input_sha256"]:
                    raise ValueError("Recorded crop no longer matches its prediction")
                crop["image"] = data_url(raw)
    render_bundle(bundle)
    print("Rendered the UI from exact saved detector and SpeciesNet results.")


def build(detector_only=False):
    detector = AnimalDetector(ROOT / "models" / "megadetector_v6.onnx")
    metadata = json.loads((ROOT / "assets" / "photos.json").read_text())
    result_dir = ROOT / "results"
    result_dir.mkdir(exist_ok=True)
    model = {"name": MODEL_ID, "description": "Finds animals, people, and vehicles; does not identify species.",
             "sha256": detector.model_sha256, "input_size": INPUT_SIZE, "score_floor": 0.01}
    now = datetime.now(timezone.utc).isoformat()
    bundle = {"model": model, "photos": [], "generated_at": now, "version": 2,
              "result_type": "genuine_cached_inference", "display_threshold": 0.30,
              "species_model": {"name": "SpeciesNet v4.0.3a crop classifier", "input_size": 480,
                                "description": "Raw classifier on selected MegaDetector crops; no geographic filtering or ensemble rules.",
                                "score_floor_for_crops": CROP_SCORE_FLOOR, "max_crops_per_image": MAX_CROPS},
              "provenance": {**detector.provenance(), "python": platform.python_version(),
                             "pillow": PIL.__version__, "numpy": np.__version__}}
    cache_path = result_dir/"species_cache.json"
    species_cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    species_ready = species_status()["available"] and not detector_only
    if not species_ready and not detector_only:
        print("SpeciesNet is unavailable; only exact previously cached crop classifications can be used.", flush=True)
    crops_dir = result_dir/"crops"
    crops_dir.mkdir(exist_ok=True)
    summary = []
    for source in metadata:
        original = load_photo(ROOT / "assets" / source["filename"])
        photo = dict(source, variants=[])
        photo["source_sha256"] = hashlib.sha256((ROOT/"assets"/source["filename"]).read_bytes()).hexdigest()
        presets = PRESETS if source["id"] != "control" else [
            ("clear", "Empty gray control", "No animal was placed in this synthetic image. Passing this easy test does not prove the model is reliable on real empty habitats.", {})]
        for variant_id, label, explanation, settings in presets:
            edited, params = transform(original, settings)
            raw, exact = encode_input(edited)
            name = f"{source['id']}_{variant_id}.jpg"
            (result_dir / name).write_bytes(raw)
            start = time.perf_counter()
            detections = detector.predict(exact, score_floor=0.01)
            elapsed = time.perf_counter() - start
            entry = {"id": variant_id, "label": label, "explanation": explanation,
                     "params": params, "width": exact.width, "height": exact.height,
                     "image": data_url(raw), "input_file": f"results/{name}",
                     "input_sha256": hashlib.sha256(raw).hexdigest(),
                     "detections": detections, "elapsed_seconds": round(elapsed, 4)}
            entry["species_crops"] = []
            for crop, crop_raw, _ in animal_crops(exact, detections):
                crop_path = crops_dir/(crop["input_sha256"]+".jpg")
                crop_path.write_bytes(crop_raw)
                crop["input_file"] = "results/crops/"+crop_path.name
                prediction = species_cache.get(crop["input_sha256"])
                if prediction and prediction.get("provenance", {}).get("model_sha256") != "d099632044e92a0446869e06e5eb282e24706d5266b4acf5b42f5f23e2b50ade":
                    prediction = None
                if prediction is None and species_ready:
                    prediction = classify_crop(crop["image"])
                    species_cache[crop["input_sha256"]] = prediction
                    temp = cache_path.with_suffix(".tmp")
                    temp.write_text(json.dumps(species_cache, indent=2)+"\n")
                    temp.replace(cache_path)
                if prediction is None and not detector_only:
                    raise RuntimeError("A crop lacks a genuine SpeciesNet result. Install speciesnet_requirements.txt or explicitly use --detector-only.")
                crop["prediction"] = prediction
                entry["species_crops"].append(crop)
                if prediction:
                    bundle["species_model"]["provenance"] = prediction["provenance"]
            photo["variants"].append(entry)
            row = {"photo": source["id"], "condition": variant_id}
            for category in ("animal", "person", "vehicle"):
                candidates = [d for d in detections if d["category"] == category]
                row[f"top_{category}_score"] = max((d["score"] for d in candidates), default=0)
                row[f"{category}_boxes_at_0.30"] = sum(d["score"] >= .30 for d in candidates)
            row.update({"all_boxes_at_0.30": sum(d["score"] >= .30 for d in detections),
                        "species_crops": len(entry["species_crops"]),
                        "input_sha256": entry["input_sha256"]})
            summary.append(row)
            scores = ", ".join(f"{category} {row[f'top_{category}_score']:.4f}"
                               for category in ("animal", "person", "vehicle"))
            print(f"{source['id']:14} {variant_id:10} {scores}; {len(entry['species_crops'])} classified crops", flush=True)
        bundle["photos"].append(photo)
    recorded = json.loads(json.dumps(bundle))
    for photo in recorded["photos"]:
        for variant in photo["variants"]:
            del variant["image"]
            for crop in variant.get("species_crops", []):
                del crop["image"]
    (result_dir/"predictions.json").write_text(json.dumps(recorded, indent=2)+"\n")
    with (result_dir/"summary.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(summary[0]))
        writer.writeheader()
        writer.writerows(summary)
    render_bundle(bundle)
    print(f"Saved genuine results and {ROOT/'offline_demo.html'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--render-only", action="store_true", help="Rebuild only the UI from saved exact results")
    parser.add_argument("--detector-only", action="store_true", help="Explicitly allow missing crop classifications")
    args = parser.parse_args()
    render_only() if args.render_only else build(detector_only=args.detector_only)
