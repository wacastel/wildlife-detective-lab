#!/bin/bash
# Run once while online; future launches use only local files.
set -euo pipefail
cd "$(dirname "$0")"

check_only=false
case "${1:-}" in
  --check) check_only=true ;;
  "") ;;
  *) printf 'Usage: bash setup_mac.sh [--check]\n' >&2; exit 2 ;;
esac

if [ ! -x .venv/bin/python ]; then
  if [ "$check_only" = true ]; then
    printf 'No working .venv found. Run bash setup_mac.sh while online.\n' >&2
    exit 1
  fi
  lab_python="${WILDLIFE_SETUP_PYTHON:-}"
  if [ -z "$lab_python" ]; then
    for candidate in python3.13 python3.12 python3; do
      if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(not (sys.version_info.major == 3 and sys.version_info.minor in (12, 13)))' 2>/dev/null; then
        lab_python="$candidate"
        break
      fi
    done
  fi
  if [ -z "$lab_python" ]; then
    printf 'Install Python 3.13 or 3.12 from https://www.python.org/downloads/macos/ and run this script again.\n' >&2
    exit 1
  fi
  "$lab_python" -c 'import sys; assert sys.version_info.major == 3 and sys.version_info.minor in (12, 13), "Choose Python 3.13 or 3.12"'
  "$lab_python" -m venv .venv
  printf 'Created this computer\047s .venv.\n'
else
  printf 'Reusing the existing .venv.\n'
fi

if [ "$check_only" = false ]; then
  .venv/bin/python -m pip install -r requirements.txt -r speciesnet_requirements.txt
  # Python.org macOS installs may not yet have their certificate command run.
  # Reuse pip's maintained CA bundle, preserving any caller-supplied setting.
  if [ -z "${SSL_CERT_FILE:-}" ]; then
    export SSL_CERT_FILE="$(.venv/bin/python -B -c 'from pip._vendor import certifi; print(certifi.where())')"
  fi
  # Existing correct model files are verified and reused without a download.
  .venv/bin/python -B setup_models.py
  .venv/bin/python -B setup_speciesnet.py
fi

.venv/bin/python -B setup_models.py --check
.venv/bin/python -B setup_speciesnet.py --check
.venv/bin/python -B - <<'PY'
import platform
import numpy, PIL, onnxruntime, torch, torchvision, onnx2torch, onnx
from app import MODEL_PATH, status
from detector import MODEL_SHA256
from speciesnet_adapter import _hash

if not MODEL_PATH.is_file() or _hash(MODEL_PATH) != MODEL_SHA256:
    raise SystemExit("The local MegaDetector model is missing or changed. Run bash setup_mac.sh while online to restore the pinned model.")
state = status()
if not state["available"] or not state["species_available"]:
    raise SystemExit(f"Setup is incomplete: {state['reason']} {state['species_reason']}")
print(f"Python {platform.python_version()}: detector and SpeciesNet dependencies and local model files verified.")
PY
printf 'Ready. Double-click launch_lab.command, or run .venv/bin/python app.py\n'
