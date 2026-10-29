#!/usr/bin/env python3
"""Explicit advance setup for the pinned SpeciesNet crop classifier.

Git clones omit the large weights. This download is needed on a fresh clone
or if local files were removed; verified existing files are reused. No
inference function calls this setup automatically.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import tempfile
import urllib.request

from speciesnet_adapter import ARCHIVE_SHA256, DEFAULT_MODEL_DIR, FILE_HASHES, MODEL_ID, MODEL_URL, _hash


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--check", action="store_true", help="Verify local bytes; never download")
    args = parser.parse_args()
    target = args.model_dir
    good = all((target / name).is_file() and _hash(target / name) == expected
               for name, expected in FILE_HASHES.items())
    if good:
        print("SpeciesNet model files verified; ready for offline inference.")
        return
    if args.check:
        raise SystemExit("Model absent or a hash differs; run setup_speciesnet.py while online.")
    target.mkdir(parents=True, exist_ok=True)
    print("Downloading the official pinned SpeciesNet archive (~209 MB). Do this before the visit.", flush=True)
    with tempfile.TemporaryDirectory(prefix="speciesnet-setup-") as work:
        archive = Path(work) / "speciesnet.tar.gz"
        with urllib.request.urlopen(MODEL_URL, timeout=120) as source, archive.open("wb") as out:
            total = 0
            while chunk := source.read(4 * 1024 * 1024):
                out.write(chunk)
                total += len(chunk)
                if total % (40 * 1024 * 1024) == 0:
                    print(f"Downloaded {total / 1e6:.0f} MB", flush=True)
        if _hash(archive) != ARCHIVE_SHA256:
            raise SystemExit("Archive hash differs from the tested release; existing local files were not changed.")
        # Copy an exact allowlist, never archive paths or links. Check every
        # extracted file before replacing the corresponding local file.
        staged = Path(work) / "checked"
        staged.mkdir()
        with tarfile.open(archive) as tar:
            for name, expected in FILE_HASHES.items():
                member = tar.getmember(name)
                if not member.isfile():
                    raise ValueError(f"Expected a regular model file: {name}")
                source = tar.extractfile(member)
                if source is None:
                    raise ValueError(f"Missing model file: {name}")
                with source, (staged / name).open("wb") as out:
                    shutil.copyfileobj(source, out)
                if _hash(staged / name) != expected:
                    raise ValueError(f"Model file hash differs: {name}")
        for name in FILE_HASHES:
            shutil.copy2(staged / name, target / name)
    (target / "download_provenance.json").write_text(json.dumps({
        "model": MODEL_ID, "source_url": MODEL_URL,
        "archive_sha256": ARCHIVE_SHA256, "files_sha256": FILE_HASHES,
        "geographic_filter_used": False, "license": "Apache-2.0"}, indent=2)+"\n")
    print("SpeciesNet setup complete. Future classification uses only local files.")


if __name__ == "__main__":
    main()
