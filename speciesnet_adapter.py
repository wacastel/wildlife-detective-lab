"""Local SpeciesNet v4.0.3a crop classification, without the ensemble.

Mirrors google/cameratrapai's classifier.py tensor preprocessing and softmax.
No model downloads occur in this module. Call setup_speciesnet.py beforehand
if the bundled model is absent. The input must already be the selected crop.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import time

MODEL_ID = "SpeciesNet v4.0.3a crop classifier"
DEFAULT_MODEL_DIR = Path(__file__).resolve().parent / "models" / "speciesnet"
WEIGHTS = "always_crop_99710272_22x8_v12_epoch_00148.pt"
LABELS = "always_crop_99710272_22x8_v12_epoch_00148.labels.20260609.txt"
TAXONOMY = "taxonomy_release.20260609.txt"
MODEL_URL = "https://www.kaggle.com/api/v1/models/google/speciesnet/pyTorch/v4.0.3a/1/download"
ARCHIVE_SHA256 = "d15d070113a03d548ebd1531fd7ca88268bdb0ba00323cfa904902a2f167b6ae"
FILE_HASHES = {
    WEIGHTS: "d099632044e92a0446869e06e5eb282e24706d5266b4acf5b42f5f23e2b50ade",
    LABELS: "e0c41415d9b29dfd6d2e2494205d1197d28595cc6f69cb129495f9827155547e",
    TAXONOMY: "4bd5d1a85a63857f557d487c5d86c0911173c59b34977ebc0ee909484ce277f2",
    "info.json": "037133d121d48a5cd53884cdee01374564f32e2cc6f1375ffb39a9bc1cf6000a",
    "README.md": "5707c487b20aef8bb779d63c32d8ca11ee7d66c12e46ff4a366047622bf49811",
    "geofence_release.20260609.json": "27a88e932e411f73a4937c935fe36cf61a9060a1c488f4c69ade3f19eb8507d1",
}
PREPROCESSING = (
    "Selected tight animal crop, RGB uint8; torchvision pil_to_tensor and "
    "convert_image_dtype(float32); tensor bilinear resize to 480x480 "
    "with antialias=False; convert_image_dtype(uint8); HWC float32 /255. "
    "This mirrors SpeciesNet crop classifier preprocessing."
)


def _hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def availability(model_dir=None) -> dict:
    model_dir = Path(model_dir or DEFAULT_MODEL_DIR)
    missing_packages = [name for name in ("torch", "torchvision", "onnx2torch", "numpy", "PIL")
                        if importlib.util.find_spec(name) is None]
    missing_files = [name for name in (WEIGHTS, LABELS, TAXONOMY)
                     if not (model_dir / name).is_file()]
    return {"available": not missing_packages and not missing_files,
            "model": MODEL_ID, "model_dir": str(model_dir),
            "missing_packages": missing_packages, "missing_files": missing_files,
            "reason": ("Local SpeciesNet crop classifier is ready. No geographic filter is applied."
                       if not missing_packages and not missing_files else
                       "Install speciesnet_requirements.txt and provide the bundled SpeciesNet model before the visit. Saved classifications still work offline.")}


def decode_label(raw_label: str, score: float, index: int | None = None) -> dict:
    """Preserve raw trained labels; never force output into our three examples."""
    parts = raw_label.split(";")
    parts += [""] * (7 - len(parts))
    identifier, class_, order, family, genus, species, common_name = parts[:7]
    if genus and species:
        scientific_name, level = f"{genus.capitalize()} {species}", "species"
    elif genus:
        scientific_name, level = genus.capitalize(), "genus"
    elif family:
        scientific_name, level = family.capitalize(), "family"
    elif order:
        scientific_name, level = order.capitalize(), "order"
    elif class_:
        scientific_name, level = class_.capitalize(), "class"
    else:
        scientific_name, level = "", "non-animal label"
    return {"label": common_name or scientific_name or raw_label,
            "scientific_name": scientific_name, "score": float(score),
            "taxon": level, "raw_label": raw_label,
            "class_index": index, "taxon_id": identifier}


class SpeciesClassifier:
    """CPU-only Google SpeciesNet classifier on already-cropped RGB images."""

    def __init__(self, model_dir=None, verify_hash=True):
        import torch
        import torchvision

        self.model_dir = Path(model_dir or DEFAULT_MODEL_DIR)
        self.model_hash = _hash(self.model_dir / WEIGHTS)
        if verify_hash:
            for filename in (WEIGHTS, LABELS, TAXONOMY):
                actual = self.model_hash if filename == WEIGHTS else _hash(self.model_dir / filename)
                if actual != FILE_HASHES[filename]:
                    raise ValueError(f"SpeciesNet {filename} differs from the tested model. Run setup_speciesnet.py to obtain the pinned release.")
        torch.set_num_threads(2)
        # The pinned official .pt is an onnx2torch FX GraphModule, not a state
        # dictionary. Loading full trusted model objects matches Google's code.
        # Hash verification happens before this deliberate weights_only=False.
        self.model = torch.load(self.model_dir / WEIGHTS, map_location="cpu", weights_only=False)
        self.model.eval()
        for parameter in self.model.parameters():
            parameter.requires_grad = False
        self.labels = (self.model_dir / LABELS).read_text().splitlines()
        if len(self.labels) != 2498:
            raise ValueError("Expected the pinned 2498-label SpeciesNet taxonomy")
        self.torch_version = torch.__version__
        self.torchvision_version = torchvision.__version__

    def provenance(self) -> dict:
        return {"model": MODEL_ID, "version": "4.0.3a", "model_sha256": self.model_hash,
                "labels_sha256": FILE_HASHES[LABELS], "num_labels": len(self.labels),
                "device": "cpu", "input_size": [480, 480],
                "preprocessing": PREPROCESSING,
                "postprocessing": "Softmax over all 2498 logits, top-k ranking only",
                "geographic_filter": False, "ensemble_rules": False,
                "torch_version": self.torch_version,
                "torchvision_version": self.torchvision_version,
                "python": platform.python_version(),
                "source": "https://github.com/google/cameratrapai/blob/main/speciesnet/classifier.py",
                "weights_source": MODEL_URL, "license": "Apache-2.0"}

    def predict(self, crop, top_k=5) -> dict:
        """Return genuine top-k classifier scores, with no geofencing/rollup.

        The caller should save/decode the exact crop JPEG first if those bytes
        are displayed or cached. This method does not recrop the input, run
        another detector, or silently correct its box.
        """
        import numpy as np
        import torch
        import torchvision.transforms.functional as F

        if not 1 <= int(top_k) <= len(self.labels):
            raise ValueError("top_k is outside the available label range")
        crop = crop.convert("RGB")
        if crop.width < 1 or crop.height < 1:
            raise ValueError("The selected animal box has an empty crop")
        start = time.perf_counter()
        # Keep tensor interpolation/uint8 conversion identical to Google's
        # classifier. PIL.resize would be a different preprocessing pipeline.
        tensor = F.convert_image_dtype(F.pil_to_tensor(crop), torch.float32)
        tensor = F.resize(tensor, [480, 480], antialias=False)
        tensor = F.convert_image_dtype(tensor, torch.uint8)
        pixels = tensor.permute([1, 2, 0]).numpy()
        batch = np.stack([pixels / 255], axis=0, dtype=np.float32)
        with torch.inference_mode():
            logits = self.model(torch.from_numpy(batch)).cpu()
            if list(logits.shape) != [1, len(self.labels)]:
                raise ValueError(f"Unexpected SpeciesNet output shape {list(logits.shape)}")
            scores, indices = torch.topk(torch.softmax(logits, dim=-1), k=int(top_k), dim=-1)
        topk = [decode_label(self.labels[int(index)], float(score), int(index))
                for score, index in zip(scores[0], indices[0])]
        return {"status": "ok", "result_type": "genuine_classifier_output",
                "model": MODEL_ID, "topk": topk, "provenance": self.provenance(),
                "crop_size": [crop.width, crop.height],
                "input_rgb_sha256": hashlib.sha256(crop.tobytes()).hexdigest(),
                "elapsed_seconds": round(time.perf_counter() - start, 4),
                "note": "Raw crop-classifier scores, not calibrated probabilities. No geographic filtering or ensemble rules."}


def main():
    """JSON-lines worker: one local crop path in, one prediction out.

    Example line: {"crop_path":"results/crops/deer.jpg","id":"example"}
    Pass --check for a dependency/file availability check, without model load.
    """
    import argparse
    import sys
    from PIL import Image

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        print(json.dumps(availability(args.model_dir)), flush=True)
        return
    classifier = SpeciesClassifier(args.model_dir)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            with Image.open(request["crop_path"]) as image:
                result = classifier.predict(image, request.get("top_k", 5))
            result["id"] = request.get("id")
        except Exception as error:
            result = {"status": "error", "error": f"{type(error).__name__}: {error}"}
        print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
