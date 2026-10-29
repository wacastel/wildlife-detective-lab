# Wildlife Detective Lab — learn, detect, investigate

**Find an animal, person, or vehicle. Crop an animal box. Ask a second AI which species it might be.**

Use three tabs to learn how computer vision works, run the two-model detective
lab, and investigate common questions about wildlife AI. The app
opens on **How computer vision works**.

Explore 32 bundled sources: wildlife photographs, human and vehicle camera-trap
examples, and a synthetic empty control. The collection adds 15 licensed
camera-trap scenes, with three more each for deer, raccoons, coyotes, people,
and vehicles. None of the added captures is established as an Illinois photo;
their actual source regions and rights are recorded in
[assets/CAMERA_TRAP_SOURCES.md](assets/CAMERA_TRAP_SOURCES.md).
Each saved example includes genuine MegaDetector
results; animal crops have genuine SpeciesNet classifications. Identical crop
bytes reuse the same genuine classification. No species result is invented or
copied from the human-written source label. Source credits and model evidence
are preserved in `assets/photos.json` and `results/predictions.json`.

## Start here: no installation, fully offline

Clone or download this repository, then open **offline_demo.html** in a modern
browser. All images, boxes, crops, classifier
results, explanations, and student Q&A are embedded. No Python, account,
network, API key, server, or model download is required for this mode.

1. **How computer vision works:** start with wildlife conservation, how camera
   traps gather evidence, and how AI helps people review large photo collections.
   Explore credited day, night, and winter camera-trap photos, then open the same
   images in the detective lab to inspect genuine model results.
   See a real tree-mounted camera and try its illustrated day/night trigger.
   Then change a small pixel grid, move a 3 × 3
   filter, and calculate a toy neuron's training steps. Read the Python model,
   training, and inference examples. These clearly labeled teaching calculations
   run in the browser; they do not train a custom wildlife model or change the
   bundled MegaDetector or SpeciesNet weights.
   Section 06 follows a real deer, raccoon, or coyote photograph through exact
   detector resizing, a labeled edge illustration, genuine saved boxes, an
   adjustable cutoff, an exact animal crop, SpeciesNet labels, and human review.
2. **Detective lab:** start with the basic two-model workflow. Choose a photo,
   inspect its genuine saved MegaDetector boxes, select an accepted animal crop,
   and click **Identify this crop** to reveal its saved SpeciesNet labels,
   scores, and taxonomic ranks. Human reference labels remain separate. The
   open **Live lab** section follows for new local runs. Farther down, the
   quality experiments compare darkness, blur, fewer pixels, a smaller scene,
   obstruction, and grayscale. Predict before revealing; adjust **Minimum
   detection score** to investigate weak candidates and mistakes.
3. **Questions & investigations:** open an answer and use its investigation button
   to load a related genuine saved example in the question tab's mini lab.
   Its condition chooser, detection cutoff, crop selection, and species reveal
   work offline. The underwater light calculation is labeled illustrative;
   these land-camera examples do not establish thermal or underwater performance.

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

The app opens **http://127.0.0.1:8765**. Select the **Detective lab** tab. In
the basic workflow, choose a photo and click **Run detector on this photo**
for a fresh local run. The **Live lab** section is expanded by default; choose
an allowed JPEG/PNG/WebP or the selected source, optionally adjust the image,
and click **Run detector**. Phone JPEGs that contain an auxiliary image (MPO)
are supported using their primary photo. Results, boxes, crops, and species
output appear in the section where you ran them. Select an actual animal crop,
then **Identify this crop** to perform a fresh SpeciesNet classification.
Stop with Ctrl+C. If the port is busy: `.venv/bin/python app.py --port 8766`.

The detector can run with only `requirements.txt`; SpeciesNet needs its
additional requirements. Both status messages are separate. Missing classifier
dependencies do not turn a saved classification into a live claim. The server
listens only on the laptop loopback interface; images are not sent to an online
AI service. Upload limit is 8 MiB and 24 megapixels.

The local app loads saved images as needed from verified local files, keeping
the initial page small. `offline_demo.html` remains the larger, fully embedded
export for use without a server; both modes show the same saved predictions.

The original kit was generated on Linux/CPU with Python 3.12. Earlier macOS
detector runs used Python 3.13.7; the three-tab expansion was rebuilt using the
existing Python 3.13.2 environment. Exact crop classifications retain their
original runtime provenance; matching bytes were reused and new crops were
classified locally. Both live
stages and model hashes have been checked. Windows has not been execution-tested. If the
pinned PyTorch pair has no wheel for your OS/Python combination, use a supported matching
pair from the [official PyTorch selector](https://pytorch.org/get-started/locally/)
and rehearse again; numerical results can differ. The standalone HTML avoids
all installation issues. An existing separate environment can be selected with
`WILDLIFE_SPECIES_PYTHON` set to its Python executable before starting the app.

**Rehearsal:** turn off Wi-Fi; test the saved HTML, one live detector run, and
one live SpeciesNet classification on the actual laptop you will bring.

## Add your own photos to the chooser

1. Put copies of JPEG (`.jpg` or `.jpeg`), PNG, or WebP photos directly in the
   project's **user_photos/** folder. Phone JPEGs with auxiliary MPO frames
   work too. Each file may be up to **8 MiB and 24 megapixels**. Subfolders
   and symbolic links are not followed.
2. Start the existing local app with `.venv/bin/python app.py` and open the
   **Detective lab** tab. Your files appear under **Your photos · user_photos/**
   alongside the bundled examples in the photo chooser. The list refreshes
   every 15 seconds while that tab is visible and when you return to the
   browser. Click **Refresh photos** for an immediate check; no server restart
   is needed. Files that cannot be used are listed with a reason.
3. Select a file to see its resized preview, labeled **not analyzed**. Click
   **Run detector on this photo** to run MegaDetector, then select an actual
   animal crop and identify it with SpeciesNet. Selecting a file alone does
   not run either model. To experiment with its quality, use the Live lab's
   controls and run the detector again.

The standalone HTML cannot read this folder without the local Python app.
Folder photos and uploads stay out of Git, the embedded saved example bundle,
and **Download exact saved results**. The app serves a resized JPEG preview
with photo metadata removed; inference starts from the original file's primary
image. See [user_photos/README.md](user_photos/README.md).

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

- `offline_demo.html`: generated self-contained activity with all three tabs.
- `ui_template.html`, `app_tabs.css`, `lab_interactions.js`: editable tab/lab
  layout, styling, and interactions.
- `lesson_content.html`, `lesson_styles.css`, `lesson_interactions.js`: editable
  computer vision lesson and its browser-only teaching calculations. The
  builder embeds these fragments, styles, and scripts into the standalone HTML.
- `camera_trap_content.html`, `camera_trap_styles.css`,
  `camera_trap_interactions.js`: the mounted-camera photograph and illustrated
  PIR trigger, daylight, and infrared night-light lesson.
- `inference_walkthrough.css`: the real-photo walkthrough in Section 06. Its
  lossless 640 × 640 teaching previews are regenerated from hash-verified saved
  inputs during rendering; recorded inputs and model results remain unchanged.
- `assets/camera_trap_equipment.json`: credit, CC BY 2.0 license, source, and
  exact hash for the equipment photograph. It is a teaching asset, not another
  inference source.
- `app.py`, `local_photos.py`, `image_lab.py`, `detector.py`: local server,
  drop-in photo catalog, controlled edits, and real detector.
- `user_photos/`: local drop-in photos; only its instructions belong in Git.
- `crop_pipeline.py`: tight crops from actual boxes, with exact JPEG hashes.
- `speciesnet_adapter.py`, `speciesnet_worker.py`, `species_bridge.py`: actual
  pinned SpeciesNet classifier and separate local process.
- `models/`: original notices, taxonomy, hashes/licenses, and locally installed
  MegaDetector and SpeciesNet weights after setup.
- `setup_mac.sh`, `launch_lab.command`: macOS setup/check and local launcher.
- `setup_models.py`, `setup_speciesnet.py`: explicit pinned model downloads;
  `--check` verifies existing files without downloading anything.
- `assets/photos.json`, `assets/CAMERA_TRAP_SOURCES.md`: credits, source links,
  human labels/counts, quality notes, source regions, and preparation information.
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
`.venv/bin/python build_demo.py`. Re-render only the UI and its editable
fragments from verified saved image hashes:
`.venv/bin/python build_demo.py --render-only`. No new inference runs in render-only mode.
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

The original public-domain wildlife photographs retain their source-page
rights designations. The additional camera-trap photographs come from
ENA24-detection, Seattle(ish), and Caltech Camera Traps under
CDLA-Permissive-1.0. Complete credits, source URLs, source-rights notes, and
known source regions are in `assets/photos.json` and
`assets/CAMERA_TRAP_SOURCES.md`.
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
