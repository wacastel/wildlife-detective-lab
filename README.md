# Wildlife Detective Lab — expanded two-model edition

**Find an animal, person, or vehicle. Crop an animal box. Ask a second AI which species it might be.**

Explore real wildlife photographs, human and vehicle camera-trap examples,
and a synthetic empty control. Each saved example includes genuine MegaDetector
results; animal crops have genuine SpeciesNet classifications. Identical crop
bytes reuse the same genuine classification. No species result is invented or
copied from the human-written source label. Source credits and model evidence
are preserved in `assets/photos.json` and `results/predictions.json`.

## Start here: no installation, fully offline

Clone or download this repository, then open **offline_demo.html** in a modern
browser. All images, boxes, crops, classifier
results, explanations, and student Q&A are embedded. No Python, account,
network, API key, server, or model download is required for this mode.

1. Choose a source photo. Compare wildlife with the person and vehicle examples;
   MegaDetector predicts all three broad categories. Wildlife images include
   clear daylight views, night trail-camera photos, soft focus, camouflage,
   and small/hidden animals.
2. Compare the source with a controlled edit: darkness, blur, fewer pixels,
   smaller scene, obstruction, or grayscale. Predict the result before revealing.
3. Adjust **Minimum detection score** to investigate weak candidates and mistakes.
4. Select one of the accepted **animal crops**, then click **Identify this crop**.
   Read SpeciesNet's top labels, scores, and taxonomic ranks. Compare with the
   separate human source label; a model may suggest a genus or `blank`.
5. Read the explanations of both models, species lists and training, choosing
   a cutoff, and the complete team questions.

SpeciesNet is offered only for animal candidates. A person or vehicle box
demonstrates detection without turning it into a wildlife species label.

This browser-only mode displays **genuine saved model results** for exact saved
inputs. Clicking Identify reveals the saved classification for that exact crop;
it does not run a new neural network. Moving the score slider filters existing
candidates. The UI labels saved and live output separately.

## Set up another Mac for live inference

The repository includes model notices, SpeciesNet taxonomy, and the saved
offline activity. It excludes the Python environment and both model binaries.
Setup retrieves the pinned MegaDetector ONNX archive (~8 MB) from its SPARROW
Zenodo host and the official SpeciesNet archive (~209 MB), verifies the exact
model hashes, and keeps the downloaded files locally. SpeciesNet's 224 MB
weights exceed GitHub's 100 MiB limit for individual files in ordinary Git
repositories.
See [GitHub's file-size limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

1. Install **Python 3.13 or 3.12** from [python.org](https://www.python.org/downloads/macos/)
   if neither is available. macOS's system Python may be a different version.
2. In Terminal, get the project and run setup while online:

```sh
git clone https://github.com/wacastel/wildlife-detective-lab.git wildlife-detective-lab
cd wildlife-detective-lab
bash setup_mac.sh
```

   Alternatively, use GitHub's **Code → Download ZIP**, unzip it, open Terminal
   in the extracted folder, and run `bash setup_mac.sh` there.
3. Double-click **launch_lab.command** in Finder, or run:

```sh
.venv/bin/python app.py
```

Setup creates a local `.venv` only when none exists. It reuses a working
environment and already verified model files on subsequent runs; it does not
download the weights again when their hashes match. It installs the pinned
Python packages before the visit. No account or API key is needed. To choose
a particular installed Python when creating the environment:

```sh
WILDLIFE_SETUP_PYTHON=/path/to/python3.13 bash setup_mac.sh
```

Check an existing installation without installing or downloading anything:

```sh
bash setup_mac.sh --check
```

Each computer needs its own environment. Do not copy `.venv` between computers.
After setup, both inference stages run locally without internet. The standalone
HTML also works immediately, before Python or the model weights are installed.

### Open the clone as a local project in ChatGPT Desktop

After cloning or unzipping on the MacBook Pro, add the local project folder in
ChatGPT Desktop: **Edit project → Add folder**, select `wildlife-detective-lab`,
and **Make primary**. Choose **Local** when working on the files on that Mac.
Use that folder for future edits and reuse its `.venv` and downloaded models.
See [OpenAI's project documentation](https://learn.chatgpt.com/docs/projects?surface=app)
for the current project controls.

## Other platforms and live use

On Linux, install CPU-only PyTorch first to avoid unnecessary GPU packages:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pip install torch==2.15.0 torchvision==0.29.2 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r speciesnet_requirements.txt
python setup_models.py
python setup_speciesnet.py
python app.py
```

Windows PowerShell (Python 3.12 installed):

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m pip install torch==2.15.0 torchvision==0.29.2 --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r speciesnet_requirements.txt
.venv\Scripts\python.exe setup_models.py
.venv\Scripts\python.exe setup_speciesnet.py
.venv\Scripts\python.exe app.py
```

The app opens **http://127.0.0.1:8765**. Expand **Live lab**, select a bundled
source or upload an allowed JPEG/PNG/WebP, adjust the image, and click **Run
detector**. Select one of its actual animal crops, then **Identify this crop**
to perform a fresh SpeciesNet classification. Stop with Ctrl+C. If the port is
busy: `python app.py --port 8766`.

The detector can run with only `requirements.txt`; SpeciesNet needs its
additional requirements. Both status messages are separate. Missing classifier
dependencies do not turn a saved classification into a live claim. The server
listens only on the laptop loopback interface; images are not sent to an online
AI service. Upload limit is 8 MiB and 24 megapixels.

The original kit was generated on Linux/CPU with Python 3.12. This edition's
detector runs were rebuilt on macOS with Python 3.13.7; existing exact crop
classifications were reused and new crops were classified locally. Both live
stages and model hashes have been checked. Windows has not been execution-tested. If the
pinned PyTorch pair has no wheel for your OS/Python combination, use a supported matching
pair from the [official PyTorch selector](https://pytorch.org/get-started/locally/)
and rehearse again; numerical results can differ. The standalone HTML avoids
all installation issues. An existing separate environment can be selected with
`WILDLIFE_SPECIES_PYTHON` set to its Python executable before starting the app.

**Rehearsal:** turn off Wi-Fi; test the saved HTML, one live detector run, and
one live SpeciesNet classification on the actual laptop you will bring.

## What is actually happening?

The expanded page explains the numerical pipeline in plain language:

1. Pixels are RGB numbers. Our detector resizes/letterboxes to 640 × 640.
2. A neural network combines patterns using parameters learned during training.
3. MegaDetector proposes broad-category boxes and numerical scores.
4. A score threshold selects which candidates are shown/accepted.
5. Selected tight animal-box pixels form a crop. A separate classifier,
   SpeciesNet v4.0.3a, resizes it to 480 × 480 and produces class scores.
6. People inspect both outputs before treating them as research records.

SpeciesNet here means the **crop classifier**, not Google's complete ensemble
with a detector, geographic rules, and taxonomic rollup. No geographic filter
or three-species restriction is applied. The pinned release contains 2,498
labels, including broader taxa and non-animal classes. Model input includes
pixels, not source filename, human species label, or Illinois location prior.

SpeciesNet's output vocabulary is learned during training. This bundled model
scores its fixed 2,498 labels; typing a new species list does not teach it new
species. Filtering a trained label list or using geographic rules changes
which outputs are allowed, rather than changing the learned visual model.
See `SPECIESNET_NOTES.md` and the in-app explanation for the steps and limitations
involved in adapting or training a model for a new species collection.

## What is the cutoff cutting off?

It rejects **low-scoring candidate boxes**, not part of the photograph. Image
cropping is a separate action. At minimum score **0.30**:

| Candidate score | Displayed/accepted? |
|---|---|
|0.29|No: below the minimum|
|0.30|Yes: equality is accepted|
|0.31|Yes: above the minimum|

Lowering the threshold shows more candidates, including more false alarms,
duplicates, and weak real animals. Raising it hides more suggestions, including
some real animals. It does not retrain the model or improve the image. A score
is not a calibrated probability of correctness. No box above the threshold
means **not detected at this setting**, not **no animal exists**.

Detector candidates were recorded down to 0.01; the display slider starts at
0.05. Species crops are recorded for up to the five highest-scoring animal
candidates at or above0.05. Only crops whose detector score meets the current
display minimum are offered to the second stage. The detector and classifier
scores answer different questions and are never combined into a claimed
probability of a correct species identification.

## How can we find a useful or optimal cutoff?

There is no universal optimum. The starting 0.30 is a demonstration setting,
not a validated operating point for a field conservation program.

- Define the goal before tuning: high animal recall within a review budget,
  an explicit cost for missed animals versus false alarms, or an F1 balance.
- Independently label a representative **validation** collection, with empty
  scenes, difficult cases, relevant species, camera sites, seasons, and day/night
  conditions. Keep related encounters together; hold out sites when appropriate.
- For each candidate score threshold, compare predicted boxes with human boxes.
  Use one-to-one matching and a stated overlap requirement, such as IoU ≥ 0.5.
  Duplicates count as false positives, not extra correct animals.
- Measure precision=TP/(TP+FP), recall=TP/(TP+FN), and review workload. Inspect
  conditions/species separately. Frame filtering and accurate localization are
  different tasks and may need different evaluation rules.
- Choose the goal's tradeoff, freeze it, and check it on an untouched **test**
  collection. Validate again if camera types, habitats, or the model change.

The kit includes **evaluate_thresholds.py** and an intentionally unreviewed
**validation_annotations.example.json**. The script refuses to invent human
answers or optimize with an empty/unreviewed annotation template. For a real
independently annotated collection whose IDs match the prediction JSON:

```sh
python evaluate_thresholds.py --annotations my_validation.json --predictions results/predictions.json --objective cost --miss-cost 5 --false-alarm-cost 1 --min-recall 0.90 --output threshold_sweep.csv
```

The costs and recall target in that command are **illustrative policy choices**,
not recommended optimal settings. F1 is another supported objective. The output
is a validation candidate plus a threshold table, not a guarantee of performance.
These selected teaching photos and artificial edits cannot establish a field
optimum. Never copy detector boxes into the human-answer file as ground truth.

## Genuine examples worth trying

| Exact photo/condition | Observation from the actual models |
|---|---|
|Original raccoon / Source photo|MD animal score≈0.736; SpeciesNet northern raccoon≈0.988|
|Original raccoon / Out of focus|MD animal score≈0.968 with a poor oversized box; SpeciesNet's top label is blank≈0.335|
|Original coyote / Out of focus|MD animal score≈0.955; SpeciesNet gives Canis genus≈0.897, not a species-level identification|
|Raccoons: night trail camera / Source photo|Two raccoons are visible/described by the source; MD accepts one box at 0.30|
|Raccoon: hidden among trees / Source photo|Three accepted boxes for one raccoon, including a background false positive; SpeciesNet calls that background crop blank≈0.938|
|Control: empty gray image / minimum 0.05|MD weak false animal score≈0.056; SpeciesNet's top label for that crop is blank≈0.312|

A hard-looking source does not have to fail. Several night/obscured/snow photos
are detected well. Image degradation can even increase scores or worsen box
localization: students should predict, inspect, and explain rather than assume
a perfectly descending score curve.

## Files and evidence

- `offline_demo.html`, `ui_template.html`: self-contained activity and readable UI source.
- `app.py`, `image_lab.py`, `detector.py`: server, controlled edits, real detector.
- `crop_pipeline.py`: tight crops from actual boxes, with exact JPEG hashes.
- `speciesnet_adapter.py`, `speciesnet_worker.py`, `species_bridge.py`: actual
  pinned SpeciesNet classifier and separate local process.
- `models/`: original notices, taxonomy, hashes/licenses, and locally installed
  MegaDetector and SpeciesNet weights after setup.
- `setup_mac.sh`, `launch_lab.command`: macOS setup/check and local launcher.
- `setup_models.py`, `setup_speciesnet.py`: explicit pinned model downloads;
  `--check` verifies existing files without downloading anything.
- `assets/photos.json`: credits, source links, human labels/counts, quality notes,
  original locations, preparation information.
- `results/predictions.json`, `summary.csv`: actual inputs/settings/boxes/crop
  predictions. `results/crops/` stores the exact JPEG classifier inputs.
- `results/species_cache.json`: genuine classifications keyed by exact crop hash.
- `FACILITATOR_GUIDE.md`, `HOW_IT_WORKS_AND_QUESTIONS.md`, `SPECIESNET_NOTES.md`:
  teaching plan, technical answers/sources, and implementation evidence.
- `evaluate_thresholds.py`: validation threshold sweep with one-to-one matching.
- `VALIDATION.md`: checks actually performed and limits.

The builder saves/decodes each exact input JPEG before detection; it does the
same for crop JPEGs before classification. Model hashes and runtime versions
are recorded. Rebuild new predictions with both dependency sets installed:
`python build_demo.py`. Re-render only the UI from verified saved image hashes:
`python build_demo.py --render-only`. No new inference runs in render-only mode.
An explicit `--detector-only` rebuild permits missing species classifications.
For a fresh clone or if weights were removed, `python setup_models.py` and
`python setup_speciesnet.py` explicitly restore their pinned models online.
Their `--check` mode only checks local hashes. Neither inference stage
automatically downloads anything. On macOS, `bash setup_mac.sh` handles both
downloads and the HTTPS certificate bundle used to verify the connections.

## Geography, source material, and licensing

These species are relevant to northern Illinois; the sample photographs were
not established as Illinois captures. Real source locations appear beside the
pictures. The existing Northern_Illinois_Wildlife_and_AI presentation supplied
local conservation context. This activity remains a separate practical lab.
Felidae's March 2026 WildePod guide describes Bay Area image processing, not
Illinois research findings. Its concepts transfer; its regional findings do not.

Photo source pages designate the wildlife images Public Domain; the complete
credits, source URLs, and any source-rights notes are in assets/photos.json.
The additional human and vehicle camera-trap photographs come from the
Seattle(ish) and Caltech Camera Traps datasets under CDLA-Permissive-1.0.
The complete dataset license is in `assets/licenses/CDLA-Permissive-1.0.txt`;
the metadata preserves their sources and describes resizing/re-encoding.
The gray control is synthetic. Darkening, blur, downsampling, obstruction,
grayscale, and gray-canvas shrinking are clearly labeled teaching edits, not
faithful simulations of night sensors, camouflage, underwater imaging, or
physical camera distance.

New demo code/text uses LICENSE.txt (MIT). MegaDetector retains its separate
upstream notices/terms. SpeciesNet retains Apache 2.0 and its original model
README/license. Keep those model notices and photo credits when reusing the kit.

Primary model sources:
- https://github.com/microsoft/MegaDetector
- https://github.com/google/cameratrapai
- https://github.com/google/cameratrapai/blob/main/advanced_topics.md
- https://github.com/google/cameratrapai/blob/main/speciesnet/classifier.py

Threshold references:
- https://developers.google.com/machine-learning/crash-course/classification/thresholding
- https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall
- https://scikit-learn.org/stable/modules/classification_threshold.html
