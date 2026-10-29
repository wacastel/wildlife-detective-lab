# Wildlife Detective Lab

Work directly in this project unless the user requests a different checkout.
Reuse the existing `.venv/bin/python` and local model files. Do not recreate
the environment, reinstall dependencies, or download models for routine edits.
On a fresh clone, use the setup instructions in README.md.

`ui_template.html` is the editable interface. `offline_demo.html` is generated.
For interface-only edits, run `.venv/bin/python build_demo.py --render-only`;
this verifies the saved image and crop hashes and reuses recorded predictions.
For changes to source photos, transformations, crops, or inference, run
`.venv/bin/python build_demo.py` with both local models available.

Keep saved and live results clearly labeled. Never invent model results or
use human photo labels as model predictions. MegaDetector finds animal,
person, and vehicle boxes; this lab passes only animal candidates to the
SpeciesNet crop classifier. The bundled classifier uses its learned 2,498-label
taxonomy, with no caller-supplied species list or geographic restriction.

Preserve photo credits, dataset licenses, model notices, and exact-input hashes.
Downloaded weights, the Python environment, and user uploads stay out of Git.
Keep Mac setup instructions portable; never commit machine-specific paths.
