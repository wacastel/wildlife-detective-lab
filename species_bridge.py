"""Optional persistent SpeciesNet process, independent of detector packages."""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import threading

ROOT = Path(__file__).resolve().parent
_process = None
_lock = threading.Lock()
_availability = None


def species_status(refresh=False):
    global _availability
    if _availability is not None and not refresh:
        return _availability
    python = os.environ.get("WILDLIFE_SPECIES_PYTHON", sys.executable)
    files = list((ROOT/"models/speciesnet").glob("*.pt"))
    if not files:
        _availability = {"available": False, "reason": "SpeciesNet model files are missing. See README for setup; saved classifications remain available."}
        return _availability
    try:
        probe = subprocess.run([python, "-c", "import importlib.util,json; print(json.dumps({n:importlib.util.find_spec(n) is not None for n in ['torch','torchvision','onnx2torch','PIL','numpy']}))"],
                               capture_output=True, text=True, timeout=20)
        modules = json.loads(probe.stdout)
        missing = [name for name, available in modules.items() if not available]
        available = probe.returncode == 0 and not missing
        reason = ("SpeciesNet crop classifier ready locally." if available else
                  "Install speciesnet_requirements.txt before the visit. Saved classifications remain available. Missing: " + ", ".join(missing))
    except (OSError, ValueError, subprocess.TimeoutExpired):
        available = False
        reason = "SpeciesNet Python environment is unavailable. Saved classifications remain available."
    _availability = {"available": available, "reason": reason}
    return _availability


def classify_crop(image_data):
    """Run a new classification; errors never become invented cached results."""
    global _process
    with _lock:
        if _process is None or _process.poll() is not None:
            python = os.environ.get("WILDLIFE_SPECIES_PYTHON", sys.executable)
            _process = subprocess.Popen([python, "-u", str(ROOT/"speciesnet_worker.py")],
                                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=None, text=True, bufsize=1)
        try:
            _process.stdin.write(json.dumps({"image_data": image_data})+"\n")
            _process.stdin.flush()
            line = _process.stdout.readline()
            if not line:
                raise RuntimeError("SpeciesNet process stopped before producing a result")
            response = json.loads(line)
            if response.get("error"):
                raise RuntimeError(response["error"])
            return response
        except (BrokenPipeError, ValueError, OSError):
            _process = None
            raise RuntimeError("SpeciesNet could not return a classification; see the server terminal")
