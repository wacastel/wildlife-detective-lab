#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  printf 'Set up this computer first: open Terminal in this folder and run bash setup_mac.sh\n' >&2
  if [ -t 0 ]; then
    read -r -p 'Press Return to close. ' reply
  fi
  exit 1
fi
exec .venv/bin/python -B app.py "$@"
