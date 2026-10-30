# Wildlife AI: can we fool the animal finder?

**A 15–20 minute hands-on, two-model activity within a one-hour conversation.** Children learn how weights change, predict what will happen to an image, and inspect actual detector and classifier results. The goal is to investigate, not to make the AI win or lose.

## Use the three tabs

1. **How computer vision works** opens first. Start with biodiversity, food-web
   connections, connected habitats, and why conservation decisions need evidence.
   The expanded introduction has five real camera-trap photographs, including
   two additional night frames. Explain how AI speeds up review while people
   check difficult records and account for camera placement and survey effort.
   At the real tree-mounted camera photo, toggle Day/Night and move the illustrated
   animal past the camera; distinguish sensing a change from lighting a photo.
   Section 02 converts images to numeric inputs and demonstrates fixed-filter
   arithmetic. This preparation and forward calculation belong to both training
   and inference. Changing those pixels does not train a filter.
   Next, train the real classroom CNN for one, ten, or fifty steps. Its 5,083
   parameters include two convolutional layers (four and eight 3 × 3 filters),
   ReLU, mean pooling, and dense layers with 16 hidden units and three outputs.
   Compare predictions, loss, learned filters, and actual feature maps. Follow
   the forward pass, error, backpropagation, and exact parameter update; use the
   update-history slider to revisit a recorded step. Twelve training photos
   supply gradients; nine validation photos are checks only. In this full-batch
   lesson, one update is also one epoch. Changing the displayed photo or learning
   rate alone changes no weights. Reset restores the same seeded random weights
   and initial biases. These are calculated classroom outputs; MegaDetector and
   SpeciesNet keep their existing pretrained weights.
   Expand the separate Python examples when useful. In Section 06, choose a real animal photo and step through
   the views. Compare the exact prepared RGB image with the separately labeled
   edge illustration, then inspect real boxes, the cutoff, crop, and saved label.
2. **Detective lab** begins with basic usage: choose a photo, inspect
   MegaDetector's boxes, and identify an accepted animal crop with SpeciesNet.
   Live lab is open below that workflow. The source-image quality experiments
   come farther down, after children understand the two models' separate jobs.
3. **Questions & investigations** explores common questions about wildlife AI.
   Open an answer, then use its investigation button to load the related
   saved photo in the mini lab on the same tab. Change conditions and cutoffs,
   inspect crops, and reveal genuine recorded classifications. The underwater
   light calculation illustrates optics; it is not underwater model evidence.

## Before the visit

- Open all three tabs and try a basic crop identification, a quality experiment, and a question-linked investigation. Test with Wi-Fi switched off. Prepare any live-inference dependencies in advance; the recorded-results option works without downloads.
- Use the bundled images and keep their credits. The 32-source collection includes 15 additional licensed camera-trap scenes: three each for deer, raccoons, coyotes, people, and vehicles. No added capture was verified as an Illinois photo. ENA24 wildlife sites are unspecified within Eastern North America; people scenes are from Seattle and vehicle scenes from the Southwestern United States. See `assets/CAMERA_TRAP_SOURCES.md` rather than guessing locations.
- Keep recorded results paired with their exact input image and settings. Recorded genuine model output is useful evidence, but selecting it does not run a new prediction. Arbitrary edits require live inference; never reuse unrelated saved boxes.
- Have paper available. Children can draw their own animal boxes before seeing the model's boxes.

For personal examples, copy JPEG (`.jpg`/`.jpeg`), PNG, or WebP files directly
into `user_photos/` and run `.venv/bin/python app.py`. Each file may be up to
20 MiB and 100 megapixels; phone JPEGs with auxiliary MPO frames are supported.
The local app adds them to the photo chooser, checking every 15 seconds while
the Detective lab tab is visible and when the browser regains focus. Use
**Refresh photos** for an immediate update without restarting. Selecting a
local file shows an **unanalyzed preview**; click **Run detector on this
photo**, then identify a real animal crop. These files are ignored by Git and
excluded from the saved-results download. The standalone HTML cannot read the
folder on its own.

## Run the experiment

| Time | Action and question |
|---|---|
| 0–3 minutes | In How computer vision works, follow a real photo through one CNN training update. Compare the prepared input, feature maps, prediction, error, and parameter equation; repeat 10 steps and inspect a validation photo. Use update history to compare the network before and after learning. Ask whether lower training loss guarantees a correct unfamiliar prediction. |
| 3–5 minutes | Open Detective lab and hide the basic source photo's boxes. “Where is the animal? Draw a box. What kind is it?” Finding a location and naming a species are different tasks. |
| 5–7 minutes | Reveal MegaDetector's genuine saved boxes, or explicitly run the local detector. Check the broad category, location, and box extent. |
| 7–10 minutes | Select an accepted animal crop and click Identify this crop. Read SpeciesNet's labels and taxonomic rank; compare with the separate human label. Explain the two scores have different jobs. |
| 10–14 minutes | Move down to the quality experiments. Compare a real night/hidden source, then change darkness, blur, or resolution on one photo. Predict before revealing; do not promise scores will decrease. |
| 14–17 minutes | Adjust Minimum detection score. “At 0.30, which suggestions are hidden?” Try the empty control at 0.05; distinguish false alarms from missed animals. |
| 17–20 minutes | Open Questions & investigations, load a related genuine example, and design a better camera setup or independent test. Ask what evidence would show that a change helped. |

**Add a camera-trap visitor comparison.** Pick a human or vehicle source photo
and hide the boxes. Ask which of MegaDetector's three categories should appear:
animal, person, or vehicle. Reveal its actual output, then try a changed version
and inspect any misses or false alarms. Person and vehicle boxes stay in the
first stage; only candidates labeled animal get a crop in this lab's SpeciesNet
stage. A correctly detected visitor therefore does not need a species result.


**Keep the result surprising.** Blur or darkness often removes useful information, but a model's scores need not fall smoothly. Do not promise a particular direction or invent an expected prediction. A score is the model's numerical output, not a calibrated probability that its answer is correct. These few photographs illustrate behavior; they do not measure general accuracy.

## SpeciesNet and the cutoff

The first tab explains model building, training, and inference; the third tab
contains the team's answers and related investigations. **Minimum detection
score** hides candidates below that number; it does not crop the photograph.
Only accepted animal boxes are offered as crops. The SpeciesNet v4.0.3a
classifier returns real labels, including higher taxa and blank; it does not
force every crop into the three source species. Its score and the detector
score are separate.

**Explain the species list accurately.** Say: “A classifier chooses from the
labels it learned during training. Our downloaded SpeciesNet already has a
2,498-label vocabulary; we did not give it only deer, raccoon, and coyote.
A model we train for our own project would instead have the classes we train
it to recognize.” A typed species name alone teaches no visual patterns.
Filtering existing results by a local list is also different from training.

**Make training concrete.** Ask children to design a labeled collection for
deer, raccoon, and coyote: different sites, independent encounters, seasons,
poses, and day/night conditions. People check the labels and actual crops.
Explain that training adjusts weights by comparing guesses with those answers;
researchers train the output layer for their chosen classes and may fine-tune
more layers. Reserve separate camera sites for validation and a final test.
Ask what a three-species classifier might say about a fox: a confident known
label could be wrong. Keep human review and evaluate unfamiliar animals.
The app's expandable explanations and SPECIESNET_NOTES.md link Google's
recommended DIY fine-tuning tutorial. MegaDetector and SpeciesNet run inference
with their existing pretrained weights. The separate browser CNN really trains
on 12 teaching photos, while nine validation photos supply no gradients. It
predicts one of three teaching labels for a whole image rather than drawing
animal boxes or reproducing SpeciesNet's much larger vocabulary.

**Use the training visuals as measurements.** Select a filter, input channel,
and feature-map location to connect its weighted sum with the calculated response.
The forward pass uses the current parameters. Cross-entropy compares its output
with the checked label. Backpropagation uses the chain rule to calculate gradients,
and the optimizer subtracts learning rate times gradient from each parameter.
Let children train one step first, then a group of steps. Inspect an earlier
recorded update to compare what changed. Reset restores a repeatable seeded
initialization; an untrained network's outputs need not be equal.

Compare training and validation curves without promising that both improve.
This tiny collection can encourage background or lighting shortcuts, and the
teaching split does not establish independent camera sites or field accuracy.
Because the validation photos are repeatedly inspected, they are not an
untouched final test set. A real conservation model still needs a much larger,
representative collection and an independent final evaluation.

A useful cutoff is selected on independently labeled validation data using a stated precision/recall or mistake-cost goal, then checked on an untouched test set. The default 0.30 is a demo setting. See HOW_IT_WORKS_AND_QUESTIONS.md and README.md for the full method and optional evaluator.

## Questions and answers

The app presents these topics on its third tab with investigation buttons.
Use the mini lab to inspect genuine saved examples where the question concerns
visible image clues or model errors. Keep heat, infrared sensors, and underwater
optics distinct from RGB image edits; an illustrative calculation cannot
validate a sensor or a model on those image types.

**What is AI, and how does it differ from ordinary programming?** AI is software designed to perform tasks such as recognizing patterns, making predictions, or generating material. A conventional instruction might say “multiply every pixel's brightness by this number.” A learned detector instead uses parameters adjusted from many labeled examples to find useful patterns. Programmers still write the training and inference software. Rule-based AI also exists; not every AI learns in the same way. Machine learning is one approach to AI, deep learning is one kind of machine learning, and this image detector is a computer-vision model. It is doing a recognition task, rather than generating a story like a chatbot.

**What can it do—and what can it not do?** A detector can help locate likely animals and prioritize photographs for review. It can miss animals, find misleading shapes, and struggle with unfamiliar pictures. It cannot reliably recover visual evidence the camera never recorded. A detection count in one image is not a count of unique animals across a collection: the same animal may appear many times. People must check results and use an appropriate research design before drawing conservation conclusions. MegaDetector's official documentation distinguishes locating animals from species classification. [1]

**Does animal color matter?** Color can be one clue among edges, textures, shapes, and context. A red fox is not recognized simply by checking for orange pixels: autumn leaves can be orange too. A color change may affect the model differently from the way it affects us. Removing color tests the model on a grayscale version; it does not create real infrared data.

**What about size and shape?** Ears, tails, legs, and body outlines can provide useful patterns. Unusual poses or hidden body parts can make them harder to use. A nearby squirrel can occupy more pixels than a distant deer. Pixel size is not body size: estimating physical size needs information such as scale, distance, or calibrated cameras.

**Do difficult habitats matter?** Tall grass, leaves, branches, snow, rain, and clutter can hide or change useful clues. A model may also learn background shortcuts and struggle at an unfamiliar camera site. Test on labeled images from the habitats and camera types where the model will be used, including sites held out of training. Camera-trap research has directly demonstrated the challenge of generalizing to new locations. [2]

**How do camera resolution and image clarity matter?** Pixels are tiny colored squares. Reducing resolution can remove a small animal's distinguishing details; blur mixes neighboring details together. Enlarging the resulting picture does not restore its original information. More megapixels alone do not guarantee a better result: focus, exposure, motion, optics, animal distance, and the detector's own input resizing also matter. The demo's darkening and blur are controlled edits, not complete simulations of a real camera at night.

**Are infrared and thermal pictures the same?** No. Active near-infrared imaging records infrared light reflected from a scene, often supplied by a camera's illuminator. Thermal equipment measures infrared energy associated with surface temperatures. Both require suitable sensors, and useful analysis needs models tested on the actual image type. A black-and-white filter is neither a near-infrared camera nor a thermal sensor; a rainbow filter does not measure heat. Separately, a camera trap's passive infrared motion trigger decides when to take a picture—it is not the software that later draws animal boxes. [3]

**Can it find a camouflaged animal?** Sometimes, if enough useful clues remain, but camouflage and obstruction can fool both people and models. It cannot see through an opaque branch just because it is AI. To improve a model, collect real camouflaged and partly hidden animals, have people mark animal boxes, and train or fine-tune with varied backgrounds, seasons, poses, and empty frames. Keep separate encounters and camera sites for a fair test, rather than testing on the training photographs. More examples can help; they cannot guarantee success when visual evidence is missing. Lowering a score threshold can reveal weak candidates but does not create that evidence. Covering a photograph with a patch demonstrates obstruction; it is not a scientifically faithful camouflage simulation.

**Can it recognize animals underwater—and how deep?** Potentially, with suitable equipment, training, and testing. There is no single depth limit for AI or underwater photography: visibility depends on light, water clarity, particles, and camera-to-animal distance, while the housing has its own depth/pressure rating. A camera submerged near an animal faces a different problem from one trying to look down through a reflective water surface. Water changes light, color, contrast, and apparent geometry; suspended particles can also obscure an animal. Researchers may need waterproof housings, suitable lighting or other sensing equipment, and a model evaluated on real underwater data. A detector trained for land-based camera traps should not be assumed reliable underwater. A blue tint over a woodland image is not an underwater experiment. NOAA's photography guidance explains why underwater optics and illumination need special attention. [4]

## Three genuine surprises to try

- **Raccoon → Lights down:** its animal score is about 0.259, so its box disappears at the default 0.30 cutoff. Lowering the cutoff reveals the weak candidate; it does not improve the photograph.
- **Control: empty gray image → cutoff 0.05:** a weak animal box appears (about 0.056). This is a real false positive. At 0.30 it disappears. This synthetic control is deliberately simple and tells us little about performance on real empty habitats.
- **Deer → Partly hidden:** two boxes appear around parts of one deer at 0.30. In the blurred examples, boxes can become far too large even while scores rise. Ask children to check the box's location and extent, not just its score.

## Connect the demonstration to conservation

The **March 3, 2026 WildePod User Guide** describes Felidae Conservation Fund's **San Francisco Bay Area** workflow: MegaDetector helps detect objects and filter empty camera-trap images; volunteers identify species and count animals. This is a concrete division of labor, not evidence that MegaDetector identifies species. The separate Felidae species guide supports that human identification work. Its local species list and geographic findings must not be presented as northern Illinois research. The workflow concepts are transferable. [5, 6]

For the Illinois connection, recall the existing presentation's Blanding's turtles in DuPage/Lake County, Montrose piping plovers, Cook County coyotes, and river otters in Cook/Will County. These are discussion examples from the presentation, not claims about the demo model's labels or sample-photo locations. Different research questions can require different tools: a trail-camera detector does not replace turtle tracking or shorebird field observations. Locally, Will County's Forest Preserve District explains that trail-camera observations contribute to habitat management alongside other monitoring methods. [7]

Ask: **“If our camera missed more animals in thick grass than on an open path, could we accidentally think the open path had more animals?”** Yes. Better detection, representative tests, and human review make the research evidence more useful. A model finding fewer boxes does not by itself establish fewer animals.

## Optional pacing for the full hour

| Minutes | Focus |
|---|---|
| 0–10 | Use the first tab to ask what children think AI is, compare pixel arithmetic with learned weights, and inspect the training demonstration. |
| 10–30 | Run the second tab's basic two-model workflow, then its quality experiments. |
| 30–40 | Open Questions & investigations and let children choose linked camera or habitat investigations. |
| 40–50 | Connect detection, species identification, human review, and a real conservation question. |
| 50–60 | Let children design a fair test or sketch a better wildlife-camera setup; finish with their remaining questions. |

## Sources

1. MegaDetector, official project: animal/person/vehicle detection and separate species-classification task. https://github.com/agentmorris/MegaDetector
2. Beery, Van Horn & Perona, *Recognition in Terra Incognita*, ECCV 2018. https://openaccess.thecvf.com/content_ECCV_2018/html/Beery_Recognition_in_Terra_ECCV_2018_paper.html
3. Teledyne FLIR, active IR versus thermal imaging. https://oem.flir.com/support/support-center/knowledge-base/what-is-the-difference-between-active-ir-and-thermal-imaging/
4. NOAA, *Tips for Getting the Perfect Shot*, underwater light and optics. https://sanctuaries.noaa.gov/news/may21/photo-video-tips.html
5. Felidae Conservation Fund, *WildePod User Guide*, March 2026. https://docs.google.com/document/d/1WA_uWU-ILR59V1NFB7K5tSEKFk6RJCyjlwwyTdMU68Y/edit
6. Felidae Conservation Fund, camera-trap species identification guide. https://docs.google.com/document/d/1kC7azQF16uUWNelB45xa4R-anhW96Kpn7YzNtAQxTms/edit
7. Forest Preserve District of Will County, *How we monitor wildlife in the preserves*. https://www.reconnectwithnature.org/headlines/news/wildlife-monitoring-in-the-preserves

Illinois presentation context: *Northern_Illinois_Wildlife_and_AI*, updated October 28, 2026. Reuse its cited local research examples; this activity is a separate experiment, not a replacement presentation.
