# Your own photos

Drop copies of your JPEG (`.jpg` or `.jpeg`), PNG, or WebP photos directly
inside this folder. Phone JPEGs with an auxiliary image are supported too.
Each file may be up to 8 MiB and 24 megapixels.

Start the local lab with `.venv/bin/python app.py`, then use the photo-folder
refresh control in the app. Your photos appear alongside the included
camera-trap examples in the photo chooser. Select one and run the detector
to make a new local prediction; selecting a photo does not run either model.

The standalone `offline_demo.html` cannot read this folder without the local
Python app. New files appear after refreshing the photo list. Files that
cannot be read are listed with a reason; subfolders and symbolic links are
not followed.

These photos stay on this computer. They are excluded from Git and are not
added to the saved, shareable example bundle. The browser receives a resized
JPEG preview with photo metadata removed, while inference starts from the
original file's primary image. Keep your originals elsewhere if you need a
backup.
