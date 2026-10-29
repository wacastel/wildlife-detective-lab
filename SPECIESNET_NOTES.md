# SpeciesNet implementation and evidence

This lab runs Google's **SpeciesNet v4.0.3a always-crop classifier**, separately
from the full SpeciesNet detection/classification/geofencing ensemble. The
lab's MegaDetector boxes define the crops. Each selected crop is classified
once, without running a second detector or silently changing its box.

## Local model

- Official fixed archive: https://www.kaggle.com/api/v1/models/google/speciesnet/pyTorch/v4.0.3a/1/download
- Archive size: 209,008,825 bytes; SHA-256:
  `d15d070113a03d548ebd1531fd7ca88268bdb0ba00323cfa904902a2f167b6ae`
- PyTorch model size: 224,393,837 bytes; SHA-256:
  `d099632044e92a0446869e06e5eb282e24706d5266b4acf5b42f5f23e2b50ade`
- 52,712,340 parameters; 2,498 classifier labels in this pinned release.
- EfficientNet V2 M architecture, as described by Google's project.
- Model and code source license: Apache-2.0. Original model README and the
  project's complete Apache license are retained with the runtime files.
- Per-file hashes, source URL, taxonomy and original preprocessing source
  reference are retained in `models/speciesnet/`.

The included geofence data is retained for provenance but **not applied**.
Photographs were not all taken in Illinois; applying an Illinois geographic
filter to them would be misleading. The raw crop classifier can return a
species, higher taxon such as genus, or a non-animal label such as `blank`.
Its scores are not calibrated probabilities of correctness.

## Exact classifier input

Google's crop classifier expects a tight animal crop. The adapter follows
the official tensor preprocessing: RGB uint8 → float32 CHW → bilinear tensor
resize to 480×480 with `antialias=False` → uint8 → float32 HWC / 255. The model
produces 2,498 logits; softmax and top-k ranking produce the displayed labels
and scores. No species list is restricted to the three animals in the lab.

## Which species can it name?

The released model comes with a **fixed trained vocabulary**. Our pinned model
has 2,498 labels; the list includes species, higher taxa, and non-animal labels.
The lab does **not** ask the user for a species list, send the human source
label to the model, or restrict predictions to deer, raccoon, and coyote.
Renaming a label file cannot teach the network a new visual distinction.

Three different operations should not be confused:

| Operation | What changes? | Learns new visual patterns? |
|---|---|---|
| Run the released classifier | A crop is scored against the existing taxonomy | No |
| Apply a local allowlist, remapping, or geofence | Existing outputs are selected, grouped, or reported differently | No |
| Train or fine-tune a classifier | Weights and possibly the output classes change using labeled photographs | Yes |

Google's current classifier also supports optional `target_species_txt` input:
it returns additional scores for **existing** labels, while retaining its
ordinary top-five results. This is not free-text species recognition and does
not replace the learned taxonomy. This lab's adapter does not use that option.
See the [official classifier source](https://github.com/google/cameratrapai/blob/main/speciesnet/classifier.py).

For a **custom fine-tuned model**, the output vocabulary is the class set that
researchers actually train. A custom deer/raccoon/coyote classifier can only
choose among its learned outputs; a fox may receive a wrong known label.
Include a human-review policy and evaluate unfamiliar animals rather than
treating the largest score as proof the species is in the list.

## How to train or fine-tune for a local species collection

Fine-tuning starts with pretrained image features and adjusts them using new,
checked examples. This is a separate research workflow; the lab has no training
button and its handful of teaching photos is not a training dataset.

1. **Define the task and labels.** Decide which species can be distinguished
   in the available images. Use broader groups where species are visually
   inseparable. Decide how empty or false detector crops and unfamiliar animals
   will be handled. A name list establishes the desired outputs; labeled images
   supply the evidence for learning them.
2. **Prepare representative, licensed examples.** Collect independent encounters
   across sites, seasons, poses, and camera/light conditions. Have people check
   species labels. Inspect the actual animal crops, especially in mixed-species
   photographs: an image-level label is not automatically valid for every box.
3. **Separate the data before tuning.** Keep encounter sequences together and
   hold out camera sites. Use training data for fitting, validation for selecting
   settings, and an untouched final test for reporting performance. Ensure each
   relevant class is represented appropriately; hundreds of near-duplicate
   frames are not hundreds of independent encounters.
4. **Train a classifier for the chosen outputs.** Start with a matching
   fine-tuning implementation, fit a new classification layer for those classes,
   and optionally unfreeze more image-feature layers. Supervised training
   compares predictions with checked labels and updates weights. Select the
   checkpoint with validation evidence; training accuracy alone is insufficient.
5. **Evaluate the full crop pipeline.** Report per-class precision, recall,
   confusion patterns, and performance across sites and conditions. Inspect
   false detector crops and out-of-list animals. A classifier cannot recover an
   animal that never reached it because the detector missed the animal.
6. **Version the complete result.** Keep weights, class order, preprocessing,
   training-data provenance, split definitions, and evaluation together. Keep
   uncertain results for review and revalidate after changing deployment sites.

Google's [fine-tuning section](https://github.com/google/cameratrapai/blob/main/README.md#fine-tuning-speciesnet)
links a [DIY tutorial and training code](https://agentmorris.github.io/speciesnet-fine-tuning/).
Its data table uses `filename`, `category`, and camera `location`; it consumes
MegaDetector results and creates animal crops and a camera-based validation
split. Category mappings can merge or rename training classes. Follow that
project's current setup in a **separate training environment** so the working
lab environment and original models remain available.

That tutorial's custom checkpoint and preprocessing belong with its own
prediction code. They are **not a drop-in replacement** for this lab's pinned
2,498-label ONNX-to-PyTorch model. Integrating a custom classifier would require
an explicit adapter change, updated labels/provenance, and new verification.
No custom model was trained as part of this teaching-content update.

The lab should save a crop JPEG and classify its decoded exact pixels so the
displayed crop and cached results have the same input. The adapter reports
the input RGB SHA-256 as an additional integrity check.

## Real sample results and checks

These illustrative observations were generated from this lab's original
deer, raccoon and coyote photographs, using the top animal box, a tight crop,
JPEG quality92/no chroma subsampling, and the pinned classifier. They are
actual predictions, not an accuracy benchmark.

| Crop | Top actual label | Score, rounded |
|---|---|---:|
| Clear deer | white-tailed deer | 0.9998 |
| Clear raccoon | northern raccoon | 0.9884 |
| Clear coyote | coyote | 0.9987 |
| Blurred raccoon | blank | 0.3354 |
| Blurred coyote | canis species (genus level) | 0.8972 |

The blurred photos demonstrate that a high broad-animal detection score does
not ensure a reliable species label. Results may change when the detector
box, crop encoding, source image, model or preprocessing changes.

Validation on October 29, 2026: CPU PyTorch 2.15.0, torchvision 0.29.2,
onnx2torch 1.5.15, NumPy 2.3.5, Pillow 12.3.0, Python 3.12. The adapter's top-five
labels and scores exactly matched the downloaded official classifier source
on the deer crop. The JSON-lines worker and local model hash checks passed.
Typical measured CPU inference was approximately 0.5 seconds per crop here;
other laptops may differ.

## Primary references

- Google's project and model description: https://github.com/google/cameratrapai
- Official classifier source: https://github.com/google/cameratrapai/blob/main/speciesnet/classifier.py
- Google-linked fine-tuning tutorial and code: https://agentmorris.github.io/speciesnet-fine-tuning/
- Always-crop versus full-image variants: https://github.com/google/cameratrapai/blob/main/advanced_topics.md
- Model distribution: https://www.kaggle.com/models/google/speciesnet
- Research paper: Gadot et al., *To crop or not to crop: Comparing whole-image
  and cropped classification on a large dataset of camera trap images*, IET
  Computer Vision 2024. Linked by Google's project README.
