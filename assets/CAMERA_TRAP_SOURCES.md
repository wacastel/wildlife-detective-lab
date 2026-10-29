# Additional camera-trap teaching photographs

The October 29, 2026 expansion adds 15 real camera-trap scenes: three each
for deer, raccoons, coyotes, people, and vehicles. `photos.json` preserves the
individual download URLs, source identifiers, original and prepared SHA-256
hashes, dimensions, human reference labels/counts, and preparation notices.
These labels and observations are human metadata, never model predictions.

## Sources and credits

- **ENA24-detection:** nine wildlife images from Eastern North America. The
  released metadata identifies the species and source image number but does
  not provide exact capture sites. They are not established as Illinois photos.
  Credit: ENA24-detection contributors / University of Missouri; individual
  photographers were not supplied. Source and license evidence:
  <https://lila.science/datasets/ena24detection>.
  Citation: Yousif H., Kays R., and He Z. *Dynamic Programming Selection of
  Object Proposals for Sequence-Level Animal Species Classification in the Wild.*
  IEEE Transactions on Circuits and Systems for Video Technology, 2019.
- **Seattle(ish) Camera Traps:** three people scenes from Dan Morris's yard in
  the Seattle area, Washington. One also contains his dog. The author explicitly
  consented to his inclusion and removed images of other people. Absolute
  camera timestamps can be wrong. Source and license evidence:
  <https://lila.science/datasets/seattleish-camera-traps/>.
- **Caltech Camera Traps:** three vehicle scenes from the Southwestern United
  States, with original camera IDs and Erin Boydston's rights-holder credit in
  `photos.json`. Source and license evidence:
  <https://lila.science/datasets/caltech-camera-traps/>.
  Citation: Sara Beery, Grant Van Horn, Pietro Perona. *Recognition in Terra
  Incognita.* ECCV 2018.

All three datasets explicitly release these photographs under
**CDLA-Permissive-1.0**. The complete license is retained in
`licenses/CDLA-Permissive-1.0.txt`. Keep its text and the individual credits
when redistributing this teaching subset.

These 15 additional assets have been resized to fit within 960 × 960 and re-encoded
at JPEG quality 94 without chroma subsampling. This is a modified teaching
subset of the original datasets. Camera overlays remain visible. No artificial
darkness, blur, obstruction, grayscale conversion, scene crop, or pixelation
has been added to these source assets. The lab's separately labeled controlled
edits are generated from them during the full model rebuild. This preparation
keeps the expanded offline activity small enough for portable browser handling;
the 17 previously included source assets retain their original preparation.

## Illinois search

Illinois camera-trap work is documented by the Illinois Natural History Survey
and the Outdoor Illinois Journal, including its [statewide mammal survey
article](https://outdoor.wildlifeillinois.org/articles/caught-on-camera).
The public [Illinois coyote detection-history dataset](https://doi.org/10.5061/dryad.p8cz8wb5w)
contains survey tables and covariates rather than a reusable photograph archive.
No image-level redistribution permission for those Illinois examples was
established during this search, so they were not copied into the app. The
openly licensed datasets above provide the additional photographs without
claiming that their captures occurred in Illinois.
