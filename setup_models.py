#!/usr/bin/env python3
"""Explicitly obtain the pinned MegaDetector ONNX bytes from the SPARROW archive.

Existing matching bytes are reused. --check never downloads or changes files.
SpeciesNet has its own setup_speciesnet.py script. Model terms and original
provenance are retained in models/upstream_notices/.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import shutil
import tempfile
import urllib.error
import urllib.request
import zipfile

from detector import MODEL_SHA256

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "megadetector_v6.onnx"
ARCHIVE_URL = "https://zenodo.org/records/21890514/files/camera_trap__detector__MDV6-yolov10-c.zip?download=1"
ARCHIVE_MD5 = "86877149d72f832d2f9368722d743753"
MODEL_SIZE = 9_340_224


def digest(path, algorithm="sha256"):
    checksum = hashlib.new(algorithm)
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-path", type=Path, default=MODEL_PATH)
    parser.add_argument("--check", action="store_true", help="Verify local bytes without downloading")
    args = parser.parse_args()
    if args.model_path.is_file() and digest(args.model_path) == MODEL_SHA256:
        print("MegaDetector model verified; existing local bytes reused.")
        return
    if args.check:
        raise SystemExit("MegaDetector model is missing or has changed. Run setup_models.py while online.")
    print("Downloading the pinned SPARROW MegaDetector archive (~8 MB).", flush=True)
    with tempfile.TemporaryDirectory(prefix="megadetector-setup-") as work:
        archive = Path(work) / "detector.zip"
        try:
            with urllib.request.urlopen(ARCHIVE_URL, timeout=120) as source, archive.open("wb") as destination:
                shutil.copyfileobj(source, destination)
        except urllib.error.URLError as exc:
            raise SystemExit(f"Could not download MegaDetector: {exc}. On macOS, use bash setup_mac.sh or run Python's Install Certificates.command.") from exc
        if digest(archive, "md5") != ARCHIVE_MD5:
            raise SystemExit("Detector archive checksum differs from the pinned upstream package; local model unchanged.")
        staged = Path(work) / "model.onnx"
        with zipfile.ZipFile(archive) as package:
            candidates = [member for member in package.infolist()
                          if not member.is_dir() and Path(member.filename).name == "model.onnx"]
            if len(candidates) != 1 or candidates[0].file_size != MODEL_SIZE:
                raise SystemExit("Detector archive does not contain the expected single model; local model unchanged.")
            # Copy a selected entry's bytes; never extract archive paths.
            with package.open(candidates[0]) as source, staged.open("wb") as destination:
                shutil.copyfileobj(source, destination)
        if digest(staged) != MODEL_SHA256:
            raise SystemExit("Detector model SHA-256 differs from the tested model; local model unchanged.")
        args.model_path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=args.model_path.parent, prefix=".detector-", delete=False) as destination:
            pending = Path(destination.name)
            try:
                with staged.open("rb") as source:
                    shutil.copyfileobj(source, destination)
            except BaseException:
                pending.unlink(missing_ok=True)
                raise
        try:
            pending.replace(args.model_path)
        finally:
            pending.unlink(missing_ok=True)
    print("MegaDetector setup complete. Inference uses only local files.")


if __name__ == "__main__":
    main()
