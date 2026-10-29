# How Wildlife Detective Lab works — questions and answers

The lab uses two real pretrained models: MegaDetector for animal, person, and vehicle locations, and SpeciesNet for animal-crop classification. The explanations below accompany the interactive experiment. Numerical examples are from genuine saved model runs.

## How does an animal detector work?

**A picture goes in. Suggested boxes and labels come out. The model learned the calculations between them from examples.**

1. **Turn the photograph into numbers.** Each pixel supplies red, green, and blue values. Our detector adapter resizes the picture, adds gray padding to fit a 640 × 640 input, and scales the pixel numbers. The model does not receive the photo's filename or our human species label.
2. **Combine useful visual patterns.** A neural network applies many learned calculations. In a convolutional detector, filters respond to local patterns, and later layers combine information over larger areas. Edges, texture, shape, and context can help—but these layers are numerical patterns, not a list of human-written “if it has antlers, it is a deer” rules. Different detector architectures organize the work differently. [1]
3. **Predict locations and broad categories.** MegaDetector suggests rectangles called **bounding boxes**, one of three labels (**animal**, **person**, or **vehicle**), and numerical scores. It does not identify the species. A box says where the model thinks a relevant object is; it can be too large, too small, misplaced, or completely wrong. The camera-trap visitor photos let us test the person and vehicle categories directly. [2]
4. **Decide which suggestions to use.** The lab's minimum-score control hides weaker candidates. Some detection systems also suppress overlapping duplicate boxes. Our bundled YOLOv10 end-to-end export does not apply a separate non-maximum-suppression step; the fact that two boxes appear does not prove there are two animals. [3; local adapter]
5. **Ask people to check.** A convincing score is not evidence that a box is correct. Look at the picture and compare the box with the animal.

### How did it learn those calculations?

During **training**, people supply examples with checked labels and boxes. The model predicts, an error calculation compares its output with the checked answers, and an optimizer adjusts its numerical parameters. Repeating this process can improve its predictions. During **inference**, the trained parameters stay fixed while the model examines a new picture. Moving this lab's brightness or score sliders does not train the network. [1, 2]

## A second question: which species is inside the box?

**Detection:** “Where is an animal?” **Classification:** “What kind of animal does this picture show?”

Select an animal box from MegaDetector. The lab extracts those pixels as a **crop**, then sends the crop to the **SpeciesNet classifier**. SpeciesNet is another learned neural network. It compares image patterns with the classes it learned and returns scores and taxonomic labels. The top result is its suggestion, not a verified species record. Google's full SpeciesNet software also includes a detector and rules for combining results; here we distinguish that full workflow from the classifier stage used on our selected crop. [4, 5]

Cropping can remove distracting background, but a poor detector box may cut off an ear, include two animals, or contain only grass. A classifier cannot fix missing evidence automatically. Check the actual crop, compare the suggested species with the human source label, and keep “needs review” as a useful outcome. Show the model's exact taxon, including a broader group when appropriate; do not silently convert every result into deer, raccoon, or coyote. [4, 6]

**Two scores, two jobs:** the detector's score concerns its animal-location prediction; SpeciesNet's score concerns its class prediction on the crop. A high score from either stage is not a calibrated guarantee of correctness. Do not average or multiply them and call the result “the chance the species is correct.”

### Does SpeciesNet classify only a species list that we give it?

**It can only predict from its learned label set, but the pretrained model already comes with that set.** This lab's pinned classifier has 2,498 labels. You do not enter a new list to run it, and our three wildlife examples do not limit its choices. The photo's human reference label is never supplied to the model. Scores come from the crop pixels and trained weights. [4; bundled labels and adapter]

A custom classifier fine-tuned on a project's selected species predicts from **that training class list**. That is when the list is yours: it is defined through checked training labels and a corresponding trained output layer. An animal outside the learned list can still get a confident, wrong known label. Writing a new species name into a text file does not teach the model what it looks like.

An allowlist, label mapping, or geographic filter changes how existing outputs are selected or reported. It does not train new image features. Google's current optional `target_species_txt` interface returns extra scores for requested **existing** labels while retaining the usual top-five outputs. The lab uses neither this option nor a geographic/species filter. [14]

### How would we train SpeciesNet for our own species?

First define labels and collect expert-checked, representative animal photographs. Then make animal crops, keeping the correct label for each crop; a photo containing multiple species needs special care. Reserve independent camera sites and encounters for validation and final testing. Fit a new classification layer on pretrained features, optionally adjust more layers, and choose settings using validation data. Finally measure per-species precision, recall, confusions, and behavior on unfamiliar animals using the held-out test. Keep uncertain results for human review.

Training updates model weights from examples; moving the lab's sliders or supplying a name list does not. Keep a custom checkpoint paired with its class order and preprocessing. This lab contains inference adapters for a pinned model, so a different checkpoint needs a matching adapter and fresh verification. SPECIESNET_NOTES.md gives the fuller workflow and links the [DIY fine-tuning tutorial recommended by Google's project](https://agentmorris.github.io/speciesnet-fine-tuning/). No custom training was performed here. [15]

### Why don't person and vehicle boxes go to SpeciesNet here?

MegaDetector's **person** and **vehicle** detections are useful results in their own right. The lab shows their boxes and scores, including when an edited image causes a miss or mistake. Its crop code selects only candidates labeled **animal** for species classification. When only people or vehicles are detected, the second stage correctly has no animal crop. If a non-animal scene creates a false animal candidate, inspect that crop rather than assuming a real animal was found.

## What does “cutoff” mean?

Control label: **Minimum detection score — show boxes scoring at least…**

The cutoff is a **score threshold**, a rule for accepting or displaying model suggestions. At **0.30**, this lab keeps a candidate whose score is **0.30 or higher** and hides one scoring **less than 0.30**. What gets cut off is the **low-scoring suggestion**, not part of the photo. This is different from **cropping**, which extracts a rectangular part of the picture. [7; equality rule from this lab]

Changing the threshold does not alter the model's learned parameters, repair the photograph, or turn its score into a probability. In saved-results mode it filters existing candidates without running the model again. Stored candidates below the recording floor cannot be recovered by a display slider.

| Change | Likely benefit | Likely cost |
|---|---|---|
| Lower the minimum score | Keep more weak animal candidates, potentially missing fewer real animals | Show more false alarms and duplicate/poor boxes; create more work to review |
| Raise the minimum score | Reject more weak suggestions and often reduce false alarms | Hide some real animals as well |

These are tradeoffs, not promises that every higher-scoring box is better. **No box above the cutoff means “not detected at this setting,” not “no animal exists.”** [7, 8]

### Try the threshold on real saved outputs

The following are **actual animal-candidate counts from the original lab**, not a made-up accuracy test. Other category boxes can also appear at a low cutoff.

| Exact example | Cutoff 0.05 | Cutoff 0.30 | Cutoff 0.90 | What to notice |
|---|---:|---:|---:|---|
| Clear deer | 1 | 1 | 1 | Its top animal score is about 0.974 |
| Dark raccoon | 3 | 0 | 0 | Top animal score about 0.259; keeping more boxes does not establish three animals |
| Partly hidden deer | 2 | 2 | 0 | Two predictions can cover parts of one deer |
| Empty gray control | 1 | 0 | 0 | A genuine false alarm scores about 0.056 |

Ask: **“Would you rather inspect a few extra empty frames or accidentally throw away an important animal photograph?”** The answer helps determine the operating rule.

## How do researchers choose a useful cutoff?

There is no universal optimal value. **0.30 is this lab's starting display setting, not a scientifically optimized wildlife threshold.** Choose the threshold for a specific model, collection, and purpose.

1. **Define success first.** For a first-pass conservation filter, missing a rare animal might matter more than reviewing extra frames. A goal could be high recall with an affordable review workload. If precision and recall are equally important, an F1-based choice is possible; that is a design choice, not a natural law. [8]
2. **Prepare a representative validation set.** People independently mark the real animals and boxes. Include empty frames, common and rare species, multiple camera sites, seasons, day/night conditions, difficult habitats, and the camera types expected in use. Keep photos from the same encounter together, and hold out sites when testing new-location performance. Do not select the threshold using only the easiest examples or the images used to train the model. [9]
3. **Try multiple thresholds and compare with checked answers.** For localization, match predicted and human boxes one-to-one using a stated overlap rule, such as IoU ≥ 0.5. IoU is overlap area divided by total combined area. A matching box is a true positive; an unmatched prediction is a false positive; an unmatched real animal is a false negative. Duplicate predictions must not count as multiple correct detections. The localization-overlap threshold is separate from the detection-score threshold. [10]
4. **Measure the tradeoff.** Precision = TP/(TP+FP): “Of the boxes we accepted, how many were right?” Recall = TP/(TP+FN): “Of the real animals, how many did we find?” Inspect results by species and conditions, not just one average. For filtering whole images, evaluate the different question “does this frame contain any animal?” separately from exact box localization. [8, 10]
5. **Choose, freeze, then test.** Pick a threshold meeting the stated goal, lock it, and report performance on an untouched test set. Recheck when the model, camera, image domain, or review policy changes. The teaching examples and synthetic degradations are useful experiments; they are too few and too selected to establish a field-optimal threshold. [13]

## The students' questions

### What is AI, how is it different from code, and what can it do?

AI is software designed for tasks such as finding patterns, making predictions, planning, or generating material. Machine learning is one approach to AI; deep learning is a kind of machine learning; computer vision works with images. People still write the code. An explicit instruction can say “multiply pixel brightness by 0.1.” The learned detector uses parameters adjusted from examples to suggest animal boxes. Neither detector nor classifier knows everything: both can miss things or confidently suggest the wrong answer.

### Which animal colors, sizes, or shapes are easy or hard to spot?

Color, contrast, texture, edges, and body shape can all supply clues. Tiny or partly hidden animals provide fewer useful pixels. A nearby squirrel may cover more pixels than a distant deer, so image size is not physical body size. Measuring body length requires scale, distance, or camera calibration. Unusual poses, coats matching the background, and missing body parts may make detection or species identification harder; those effects must be tested on real examples.

### Which habitats are harder for AI?

Grass, branches, shadows, glare, snow, and muddy water can obscure useful evidence. A model can also learn shortcuts from familiar backgrounds and perform worse at a new camera site. “Forest” or “wetland” is not automatically easy or hard: camera position, visible clues, training coverage, and the actual species matter. Test the habitats where the system will be used. [9]

### What cameras work well, and how much resolution or clarity is needed?

Use cameras suited to the animal's expected distance, movement, light, and environment. Focus, shutter speed, exposure, optics, placement, and the number of pixels covering the animal matter alongside megapixels. There is no universal megapixel requirement for all models and animals. This lab's detector resizes to 640 × 640; a tiny original animal cannot gain lost detail by enlarging the image. Our blur, darkness, and pixelation controls are simplified edits, not full simulations of sensor noise or camera behavior.

### Does AI work with infrared and heat pictures?

It can, with appropriate equipment and data. Active near-infrared night imaging records reflected infrared light, often from an illuminator. Thermal cameras use a different sensor to record emitted infrared energy associated with surface temperature. A land-wildlife model's performance on actual infrared or thermal images must be checked; it cannot be inferred from a grayscale photo. The camera trap's trigger and the AI examining the recorded picture are separate parts of the system. [11]

### How can we train AI to cope with camouflage?

Collect real camouflaged and partly hidden examples, have people label animal boxes, and train or fine-tune using varied coats, poses, backgrounds, seasons, and empty frames. Test on separate encounters and sites. Training can help when useful visual evidence remains; it cannot make an opaque branch transparent. The lab's gray obstruction strip demonstrates missing evidence, not realistic camouflage or a validated camouflage-training method.

### Can cameras see underwater, and how deep?

Yes, with suitable waterproof equipment. Water changes light, colors, contrast, and apparent geometry; particles can scatter light and hide animals. There is no one depth at which all cameras stop seeing. Visibility depends on water clarity, lighting, and camera-to-animal distance, while a housing has its own pressure/depth rating. Looking through a reflective water surface differs from putting the camera near an animal underwater. Use real underwater training and tests, rather than assuming a land-camera model will transfer. [12]

### How does this help wildlife conservation?

Checked detections and species labels, combined with real camera time and location records, can help researchers study wildlife visits and habitat use. They do not automatically count unique animals. Felidae's March 2026 guide describes a San Francisco Bay Area workflow: MegaDetector helps detect objects and filter empty frames; volunteers identify species and count animals. That division of work is transferable, but its regional species and findings are not Illinois findings. The northern Illinois connection comes from the separate presentation and its cited local programs.

## Primary sources

1. TensorFlow, convolutional-network tutorial and training example: https://www.tensorflow.org/tutorials/images/cnn
2. Microsoft MegaDetector task and models: https://github.com/microsoft/MegaDetector and https://github.com/microsoft/MegaDetector/blob/main/docs/model_zoo.md
3. Wang et al., *YOLOv10: Real-Time End-to-End Object Detection*, 2024: https://arxiv.org/abs/2405.14458
4. Google, SpeciesNet overview and classifier/detector workflow: https://github.com/google/cameratrapai/blob/main/README.md
5. Google, SpeciesNet advanced topics and always-crop versus full-image models: https://github.com/google/cameratrapai/blob/main/advanced_topics.md
6. Beery et al., *Efficient Pipeline for Camera Trap Image Review*: https://beerys.github.io/assets/papers/EfficientPipeline.pdf
7. Google, thresholds and confusion matrix: https://developers.google.com/machine-learning/crash-course/classification/thresholding
8. Google, precision, recall, accuracy, and F1: https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall
9. Beery, Van Horn, and Perona, *Recognition in Terra Incognita*, ECCV 2018: https://arxiv.org/abs/1807.04975
10. Ultralytics, detection metrics and IoU: https://docs.ultralytics.com/guides/yolo-performance-metrics/
11. Teledyne FLIR, active IR versus thermal: https://oem.flir.com/support/support-center/knowledge-base/what-is-the-difference-between-active-ir-and-thermal-imaging/
12. NOAA, underwater optics/photography: https://sanctuaries.noaa.gov/news/may21/photo-video-tips.html
13. Google, training/validation/test sets and repeated tuning: https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets
14. Google, classifier implementation and optional target-label scores: https://github.com/google/cameratrapai/blob/main/speciesnet/classifier.py
15. Dan Morris, DIY fine-tuning tutorial linked by Google's SpeciesNet project: https://agentmorris.github.io/speciesnet-fine-tuning/

Implementation notes: Keep cached SpeciesNet predictions paired with the exact saved crop bytes and model version. If the display threshold hides a box, do not silently pass its crop to a stage described as using accepted detections. Clearly distinguish optional “classify a weak candidate anyway” from changing the detector's acceptance rule. Geographic filters, if enabled, must use photo provenance or explicit user input; do not assign an Illinois location to sample photographs made elsewhere.
