# Validation performed — expanded two-model edition

## Practical ML guide and public data resources - October 30, 2026

- Added Tab 3's successful-training habits, gotchas, limitations, and cases
  where ML should be replaced or deferred. Existing genuine investigations and
  a direct jump to the browser CNN connect the guidance to working examples.
- Added an explicitly illustrative frame-level confusion-matrix calculator.
  Its 99%-accuracy preset finds zero animals and has undefined precision.
  Two other presets retain the same 10 animal/90 empty balance while showing
  different recall/false-alarm tradeoffs. No model performance is invented.
- Five new math checks cover known metrics, class imbalance, comparable
  populations, zero denominators, immutable inputs, and invalid counts. All
  31 Python checks and 14 Node checks passed. The self-contained export and
  approved 549-file deployment package preserve saved-input/crop hashes and
  exclude personal photos, model-download provenance, and the local environment.
- Verified seven primary learning resources and five LILA collections with
  anonymous public MegaDetector ZIP downloads. The guide separates photos,
  human labels, and AI predictions; it records model-version/RDE caveats,
  training-data overlap, licenses, archive sizes, and a small-subset procedure.
  No image collection or prediction archive was downloaded into the project.
- Browser checks confirmed all metric presets and keyboard sliders, undefined
  metrics with empty counts, genuine question-linked experiments, the direct
  CNN jump, and accessible section navigation without disrupting the tab hash.
  At 390 px there was no horizontal overflow; no console warnings/errors.

## Convolutional training and conservation lesson - October 30, 2026

- Expanded the conservation introduction and added two existing licensed
  camera-trap frames with their credits. Section 02 distinguishes pixel encoding
  and forward filtering (both training and inference) from labels, loss,
  gradients, and optimizer updates (training).
- The real browser CNN takes 24 x 24 RGB through two learned convolutions
  (four/eight filters), ReLU and mean pooling, a 288-to-16 dense hidden layer,
  and three class scores. All 5,083 parameters are trainable. Twelve photos
  supply full-batch gradients; nine validation photos supply none. These
  curated sets are a classroom experiment, not an independent field benchmark.
- Nine Node tests passed: exhaustive numerical gradients on a small CNN,
  known intermediates, batch averaging, updates in all layers, loss reduction,
  immutable snapshots, stable extreme logits, and invalid inputs. An independent
  float64 PyTorch comparison matched all intermediates, logits, loss, and every
  weight/bias gradient; the largest absolute difference was 4.44e-16.
- All 31 Python tests passed after merging the current phone-upload fixes.
  Section 03's Python classifier parses and now
  uses the same layer sizes. The offline page reuses hash-verified saved inputs
  and crop results; the wildlife models and their predictions are unchanged.
- Browser training began at loss 1.09259 (training) and 1.11450 (validation).
  After 51 updates at rate 0.05, losses were 0.47074 and 1.48405, with accuracies
  83.3% and 44.4%. These are classroom calculations, not wildlife performance.
  Viewing step zero and a validation photo changed no current weights; training
  then correctly continued from step 51 to 52. Stop interrupted a requested
  group, and Reset reproduced the seeded initial network.
- Checked both convolution layers, zero-padded corner arithmetic, prediction
  bars, loss, before/after maps, gradient summaries, and exact parameter updates.
  At 390 px there was no horizontal overflow. Browser warnings/errors: none.
- Published final combined revision `wildlife-detective-lab-00007-vlh` after page
  and model-availability checks. Both default service addresses return public
  status successfully. On the public site, ten actual CNN updates produced
  training loss 1.02142 and validation loss 1.09813. History returned to step
  zero without changing the current step ten. Five gallery photos and the
  revised Section 02 were present; browser warnings/errors remained absent.
- Preserved the phone-photo fixes merged from current GitHub main. A 48.77 MP
  synthetic gray upload was accepted by the final public detector endpoint,
  reduced to 1280 x 960, and its returned exact-input hash verified. No personal
  photographs were uploaded for this check. The final image-only deployment
  retained public access, two-instance limits, zero minimum instances, and
  two CPUs/4 GiB per instance.

## High-resolution phone uploads — October 29, 2026

- Raised browser, local-folder, and server source-photo limits to 100 megapixels
  and 20 MiB. The JSON request allowance includes base64 overhead and remains
  below Cloud Run's 32 MiB HTTP/1 request limit.
- JPEG/MPO photos above the former 24 MP limit use decoder shrinking before
  EXIF rotation and RGB copies. Analysis still uses images at most 1280 pixels
  on the long edge; photos already within the former limit keep their existing
  decoding path and exact saved-example pixels.
- Tested all four supplied phone originals locally: three are 5712 × 4284
  (24,470,208 pixels), explaining the previous rejection. All four detect an
  animal and produce a genuine SpeciesNet domestic dog result. These private
  photographs were not added to Git or the deployment build.
- Added regressions for a 24.47 MP MPO with EXIF rotation, a 48.77 MP upload,
  files above the former 8 MiB cap, early rejection above the new limits,
  malformed images, and unchanged bundled-raccoon inference pixels.
- The full Python suite and six Node training-math checks pass. A full rebuild
  in a temporary folder verifies all saved detector inputs and crop hashes
  remain unchanged; the existing saved results and models were preserved.

## Public Google Cloud student edition — October 29, 2026

- Deployed the live CPU edition in a new dedicated personal project,
  `wildlife-lab-wc246`, region `us-central1`. Verified revision
  `wildlife-detective-lab-00003-fpc` serves 100% of traffic. Its runtime service
  account has no project roles. Service and revision scaling limits are both
  two instances; each has two CPUs and 4 GiB RAM, with zero minimum instances.
- Curated and checked 545 deployment files, including the existing pinned
  model binaries and their notices. Personal photos, `.venv`, `.git`, credentials,
  and machine download provenance were excluded. No local packages or model
  files were reinstalled/downloaded for deployment.
- Six cloud HTTP tests plus the existing 17 Python tests passed; six separate
  Node gradient/training tests passed. The cloud tests cover host/origin checks,
  absence of private folder routes, upload/crop bounds and delegation, bounded
  inference slots, recorded mode, and chunked export streaming.
- Before public sharing, an authenticated upload of a bundled deer photo ran
  through both actual Linux CPU models. Its detector input and crop byte hashes
  were checked. MegaDetector's animal score was 0.962498; SpeciesNet's genuine
  top suggestion was white-tailed deer, 0.997096. The first classifier request
  took 77.73 seconds including process/model startup. External `/healthz` was
  intercepted with a Google 404; `/api/status` is the verified readiness route.
- After publishing, unauthenticated status checks succeeded on both official
  Google-provided service addresses. In the browser, a fresh file upload produced
  an animal box and genuine SpeciesNet output inside Live lab. All three tabs,
  the new real-photo training (20 steps, loss 0.3171), the saved-photo walkthrough,
  a question-linked experiment, and 390 px layout were checked. No browser errors
  or warnings were observed. The complete 64,318,630-byte offline export downloaded
  successfully through the deployed streaming endpoint.

## Real-photo classroom training — October 29, 2026

- Replaced the abstract brightness-neuron demonstration with a three-label
  classroom classifier trained in the browser on six real animal photographs.
  Three held-out photos are excluded from every gradient calculation. Features
  are actual mean RGB pixel values within each of sixteen cells; the 48 fixed
  features feed 144 learned weights and three biases. This calculation leaves
  MegaDetector, SpeciesNet, and all recorded model results unchanged.
- Six Node tests verify every analytical gradient against finite differences,
  a known first update, repeated loss reduction, immutable evaluation/update
  inputs, reset/determinism, extreme-logit stability, and invalid-input handling.
  All 17 existing Python tests also passed.
- Browser checks on the real images started with equal 33.3% output shares and
  loss 1.0986. One update reduced mean training loss to 0.9703; after 21 updates
  it was 0.3059 while held-out loss rose to 1.7230. After 121 updates training
  loss was 0.0614 and held-out loss 2.5642. These are classroom calculations,
  not wildlife accuracy measurements; the differing curves make overfitting
  visible. Switching to a held-out photo changed no weights or step count.
- Reset restored zero weights and loss 1.0986. Selecting a cell with the
  keyboard preserved focus on the replacement button. Photo, cell, channel,
  and learning-rate controls change the view/settings without training.

## Camera hardware and real-photo walkthrough — October 29, 2026

- Added a genuine tree-mounted camera photograph with its original title,
  J.N. Stuart/USFWS credit, CC BY 2.0 link, source, and exact byte hash in
  `assets/camera_trap_equipment.json`. It is a teaching asset, not an additional
  model input. The day/night diagram distinguishes passive infrared sensing
  from infrared illumination and thermal imaging. Its example photographs are
  explicitly separate encounters. Browser checks exercised Day, Night, trigger,
  and reset, including showing and hiding the saved example.
- Replaced named-team wording with **Questions & investigations** across the
  app and guides. Checked the rendered text and the third tab's heading.
- Section 06 now follows three real saved camera-trap sources. Its lossless
  640 × 640 previews match the detector adapter's actual RGB resize and padding;
  a test compares the displayed PNG pixels against a captured adapter tensor.
  Preview generation verifies source hashes and preserves the original bundle.
  Existing saved source, detector, crop, and SpeciesNet files are unchanged.
- Browser checks covered all six stages: preparation, explicitly illustrative
  edge calculation, genuine saved boxes, cutoff, exact crop and SpeciesNet
  suggestions, and human review. A cutoff of 1.00 hid both the box and crop
  prediction; lowering it restored the matching crop without changing the
  source. Switching to raccoon and coyote examples changed their saved labels
  correctly and cleared the learning response. Step controls stay visible
  while comparing images, and full frames/crops remain visible.
- All 17 Python tests passed. The generated standalone script passes Node's
  syntax check, all fragment placeholders resolve, and render-only verification
  checks the saved detector/crop hashes. Both new sections fit a 390 px viewport
  without horizontal scrolling; no browser errors or warnings were observed.
  The standalone export is about 61.26 MiB, and the local initial page is about
  3.76 MiB including the equipment photo and three lossless teaching previews.

## Three-tab learning edition — October 29, 2026

- Added a default computer vision lesson tab, a detective lab tab ordered as
  basic usage, expanded live uploads, then quality experiments, and a question
  tab with questions and investigations about wildlife AI. Personal email
  headers, addresses, and correspondence are not bundled.
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
