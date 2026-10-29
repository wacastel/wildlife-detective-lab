# Validation performed — expanded two-model edition

## Three-tab learning edition — October 29, 2026

- Added a default computer vision lesson tab, a detective lab tab ordered as
  basic usage, expanded live uploads, then quality experiments, and a question
  tab based on the actual questions in Cory's forwarded team email. Personal
  email headers, addresses, and correspondence are not bundled.
- The lesson's editable pixel filter and sigmoid-neuron training calculate
  their displayed responses, gradients, parameter updates, and loss curves.
  Browser checks changed a filter response from 576 to 544 and reduced the
  toy training loss from 0.6931 to 0.4401 after 20 updates. Neither interactive
  trains the wildlife models. The complete Python classifier example ran all
  ten epochs on generated temporary fixtures; both Python examples compile.
- Added 15 genuine, visually inspected camera-trap sources under the retained
  CDLA-Permissive-1.0 license: three each for deer, raccoons, coyotes, people,
  and vehicles. Source URLs, original and prepared hashes, camera context,
  credits, preparation, and known source regions are preserved. No added
  image is claimed as an Illinois capture. See assets/CAMERA_TRAP_SOURCES.md.
- Rebuilt 249 detector inputs from 32 sources and 223 classified crop
  references (212 unique crop hashes) with the existing environment and local
  models. Verified exact source, input, crop, and classifier-input hashes.
  The 17 previous source images and all 129 previous saved input hashes,
  detector outputs, and crop hashes stayed unchanged.
- Browser checks covered tab selection and arrow-key navigation, pixel/filter
  editing, toy training, inference-stage explanations, the mixed person/dog
  camera-trap example, saved species reveal, independent quality experiments,
  question-linked genuine model errors, and the illustrative underwater light
  calculation. All three tabs fit a 390-pixel viewport without horizontal
  overflow. No duplicate IDs or browser errors were observed.
- The user_photos catalog shows local files without inference. A temporary
  included-photo copy was selected, detected, and classified through the
  actual local models, then removed. Its previous live source image remained
  paired with the result using a metadata-free snapshot. The original phone
  JPEG from the upload report also passed detection and fresh classification.
- Automated tests cover upload formats, primary-frame orientation, limits,
  folder changes, ignored symlinks, cross-origin boundaries, exact source/input
  hashes, local source snapshots, local Host validation, and safe saved-image
  serving. Local HTML
  loads verified images as needed; the standalone export embeds its images and
  all lesson scripts/styles. No new packages or model downloads were required.
- The standalone export was verified by exact embedding, script, and hash
  checks. Interactive browser checks used the local app; direct opening of the
  exported file in Safari was not verified in this run.

## Phone JPEG uploads — October 29, 2026

- Reproduced rejection of a valid iPhone JPEG that Pillow identifies as MPO
  because it contains an auxiliary image. The rejection happened before
  detector inference. The loader now accepts its primary photo and applies
  EXIF orientation before the existing image processing.
- Added generated-image regression tests for primary-frame selection, EXIF
  orientation, ordinary JPEG/PNG/WebP decoding, and unsupported-format rejection.
  Run them with `.venv/bin/python -m unittest discover -s tests -v`.
- Browser-tested the original phone JPEG through live detection and a fresh
  SpeciesNet crop classification. User uploads remain outside the repository.
- Completed a full rebuild with the existing environment and models. All 129
  saved input hashes, 137 crop hashes, detector boxes/scores, and genuine crop
  classifications remained identical; generation timing/runtime metadata was
  refreshed.

## Earlier three-category edition — macOS, October 29, 2026

Used the existing Python 3.13.7 `.venv`, ONNX Runtime 1.31.1, and CPU
PyTorch 2.15.0 on the development Mac. No environment was recreated and
neither model was downloaded again.

- Added two real Seattle(ish) person camera-trap photos and two Caltech vehicle
  camera-trap photos with source records, preparation notes, and the complete
  CDLA-Permissive-1.0 license. Visually inspected all four source photographs.
- Rebuilt all 129 detector inputs from 17 sources: 12 wildlife, two person,
  two vehicle, and one synthetic empty control. Saved 137 crop references,
  representing 135 unique crops, with genuine SpeciesNet classifications.
- Verified every recorded full-image and crop JPEG SHA-256, and every crop's
  classifier input hash. Cached classifications remain paired with their
  exact bytes and original model/runtime provenance.
- Original new person scenes score 0.9405 and 0.8671 for person; vehicle scenes
  score 0.9649 and 0.9714 for vehicle. All four original scenes have no animal
  crop. Some controlled edits produce false animal candidates; those genuine
  model errors remain visible rather than being replaced by human labels.
- Local HTTP detector calls exactly match the saved input bytes and detector
  results for each of the four new original scenes. A fresh local SpeciesNet
  call on the deer crop returns white-tailed deer with a matching input hash.
- Browser checks confirm the new photo choices, person/vehicle labels and
  credits, animal-only crop message, and expandable species-list/training
  explanations. The pretrained taxonomy is distinguished from a custom
  classifier's training class list; no custom training was performed.
- Verified that the generated standalone HTML matches the current template,
  every embedded image/crop matches its saved hash, and no external scripts,
  styles, or media are required. This verification browser blocks `file:`
  navigation, so direct opening of the standalone file was not repeated here;
  interactive checks used the local app serving the identical HTML.
- Parsed all Python entry points; checked interface JavaScript and HTML
  structure. `bash setup_mac.sh --check` verifies the existing dependencies
  and both model files without installation or downloads. Setup downloader
  checks cover missing models, verified-file reuse, corrupt archives, and
  preservation of existing bytes using temporary local archive fixtures.

The setup script has been checked against this existing macOS installation;
it has not yet been run on the destination MacBook Pro. Rehearse there while
online, then test both stages offline before use. Windows remains untested.
These teaching scenes are not a field accuracy benchmark.

## Original kit checks — Linux

Checked October 29, 2026 on Linux, Python 3.12.14, ONNX Runtime 1.31.1 CPU,
NumPy 2.3.5, Pillow 12.3.0. SpeciesNet used CPU PyTorch 2.15.0,
torchvision 0.29.2, onnx2torch 1.5.15, and ONNX 1.23.2 in a separate environment.
Browser checks used Chromium 131 headless shell.

- Ran actual MegaDetector inference on all 97 recorded inputs from 12 wildlife
  source photographs plus the synthetic control.
- Generated 130 exact crop references, corresponding to 128 unique crop JPEG
  hashes, with genuine SpeciesNet predictions. Both stages use local weights.
- Checked every recorded full-image and crop JPEG against its hash. Prediction
  input hashes match crop inputs. Embedded browser images match saved bytes.
- Compared the SpeciesNet adapter with Google's downloaded official classifier
  preprocessing and prediction implementation: top-five raw labels and all
  five scores exactly matched on the checked deer crop.
- Live API tests confirmed exact equality with cached detector input bytes,
  detection boxes/scores, crop JPEG hashes, and SpeciesNet top-five outputs.
- Opened the standalone HTML with browser networking disabled. All 13 source
  choices loaded. Tested crop selection and saved classifier reveal, threshold
  filtering, low-resolution no-crop states, and gray-control false-positive
  behavior at 0.05 versus 0.30.
- Verified the blurred raccoon returns blank and the blurred coyote returns a
  genus-level label, with broad rank shown rather than invented species names.
- Tested live detection, then fresh crop classification through the interface.
  Changing sources mid-request did not attach a result to the wrong crop.
- Inspected desktop and 390-pixel mobile layouts; no horizontal overflow or
  JavaScript page errors.
- Invalid IDs, parameters, image/classify payloads fail clearly; unrelated file
  routes are not exposed; cross-origin inference requests are rejected.
- Compiled all local Python entry points. The threshold evaluator refuses an
  unreviewed annotation template; meaningful matching checks confirm duplicate
  predictions count as false positives and distinct boxes do not overlap.
- Verified pinned SpeciesNet local model-file hashes with setup --check.

macOS and Windows were not available for the original Linux checks above.
The macOS checks for this edition are listed separately. Use README.md to
rehearse on the actual laptop, install packages before leaving, and keep the
standalone HTML as the no-installation backup. These selected examples and
artificial edits are not a field accuracy benchmark or a validated optimum
threshold. No species classifier acceptance threshold was tuned in this lab.
