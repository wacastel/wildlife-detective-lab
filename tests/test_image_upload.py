"""Generated upload regressions and bundled-example pixel integrity."""
import base64
import hashlib
import io
import json
import unittest
from unittest import mock

from PIL import Image, ImageDraw

import app
import local_photos
from image_lab import load_photo


class UploadDecodingTests(unittest.TestCase):
    def test_phone_jpeg_uses_primary_frame_and_exif_orientation(self):
        primary = Image.new("RGB", (120, 80), "red")
        auxiliary = Image.new("RGB", (120, 80), "blue")
        orientation = Image.Exif()
        orientation[274] = 6
        encoded = io.BytesIO()
        primary.save(encoded, format="MPO", save_all=True,
                     append_images=[auxiliary], exif=orientation)
        encoded.seek(0)
        with Image.open(encoded) as image:
            self.assertEqual(image.format, "MPO")
            self.assertEqual(image.n_frames, 2)
        encoded.seek(0)

        decoded = load_photo(encoded)

        self.assertEqual(decoded.size, (80, 120))
        self.assertEqual(decoded.mode, "RGB")
        red, green, blue = decoded.getpixel((40, 60))
        self.assertGreater(red, 240)
        self.assertLess(green, 15)
        self.assertLess(blue, 15)

    def test_existing_upload_formats_still_decode(self):
        for image_format in ("JPEG", "PNG", "WEBP"):
            with self.subTest(image_format=image_format):
                encoded = io.BytesIO()
                Image.new("RGB", (1600, 800), "green").save(
                    encoded, format=image_format)
                encoded.seek(0)
                decoded = load_photo(encoded)
                self.assertEqual(decoded.size, (1280, 640))
                self.assertEqual(decoded.mode, "RGB")

    def test_other_decodable_formats_are_still_rejected(self):
        encoded = io.BytesIO()
        Image.new("RGB", (12, 8)).save(encoded, format="GIF")
        encoded.seek(0)
        with self.assertRaisesRegex(ValueError, "JPEG, PNG, or WebP"):
            load_photo(encoded)

    def test_24_megapixel_phone_photo_accepts_real_dimensions_and_orientation(self):
        # A nominal 24 MP phone image is 24,470,208 pixels, above the old cap.
        primary = Image.new("RGB", (5712, 4284), "red")
        ImageDraw.Draw(primary).rectangle((0, 0, 2855, 4283), fill="blue")
        orientation = Image.Exif()
        orientation[274] = 6
        encoded = io.BytesIO()
        primary.save(encoded, format="MPO", save_all=True,
                     append_images=[Image.new("RGB", (12, 8), "green")],
                     exif=orientation)
        primary.close()

        decoded = local_photos.decode_photo(encoded.getvalue())

        self.assertEqual(decoded.size, (960, 1280))
        self.assertEqual(decoded.mode, "RGB")
        # EXIF 6 rotates the original blue left half to the top half.
        upper = decoded.getpixel((480, 320))
        lower = decoded.getpixel((480, 960))
        self.assertGreater(upper[2], 240)
        self.assertLess(upper[0], 15)
        self.assertGreater(lower[0], 240)
        self.assertLess(lower[2], 15)
        self.assertIsNone(decoded.getexif().get(274))

    def test_48_megapixel_upload_reaches_detector_only_after_downsizing(self):
        source = Image.new("RGB", (8064, 6048), "orange")
        encoded = io.BytesIO()
        source.save(encoded, format="JPEG")
        source.close()
        raw = encoded.getvalue()
        detector = mock.Mock()
        detector.predict.return_value = []

        with mock.patch.object(app, "_detector", detector):
            result = app.predict({"image_data": "data:image/jpeg;base64," +
                                  base64.b64encode(raw).decode("ascii")})

        detector_input = detector.predict.call_args.args[0]
        self.assertEqual(detector_input.size, (1280, 960))
        self.assertEqual(detector_input.mode, "RGB")
        self.assertEqual((result["width"], result["height"]), (1280, 960))
        self.assertEqual(result["source_type"], "upload")
        self.assertEqual(result["source_sha256"], hashlib.sha256(raw).hexdigest())
        actual = base64.b64decode(result["image"].split(",", 1)[1])
        self.assertEqual(result["input_sha256"], hashlib.sha256(actual).hexdigest())

    def test_existing_bundled_photo_keeps_its_recorded_input_pixels(self):
        bundle = json.loads((app.ROOT / "results" / "predictions.json").read_text())
        photo = next(photo for photo in bundle["photos"] if photo["id"] == "raccoon")
        original = next(variant for variant in photo["variants"]
                        if variant["id"] == "clear")
        detector = mock.Mock()
        detector.predict.return_value = []

        with mock.patch.object(app, "_detector", detector):
            actual = app.predict({"photo_id": "raccoon"})

        self.assertEqual(actual["input_sha256"], original["input_sha256"])
        self.assertEqual((actual["width"], actual["height"]),
                         (original["width"], original["height"]))

    def test_valid_jpeg_larger_than_old_byte_limit_is_accepted(self):
        encoded = io.BytesIO()
        Image.new("RGB", (12, 8), "green").save(encoded, format="JPEG")
        raw = encoded.getvalue()
        # JPEG permits bytes after its end marker; no large image allocation
        # is needed to exercise the original file-size restriction.
        raw += b"\0" * (8 * 1024 * 1024 + 1 - len(raw))
        self.assertEqual(local_photos.decode_photo(raw).size, (12, 8))

    def test_excessive_pixel_header_is_rejected_before_image_decode(self):
        header = mock.MagicMock()
        header.__enter__.return_value = header
        header.format = "JPEG"
        header.width, header.height = 10001, 10000
        with mock.patch("image_lab.Image.open", return_value=header):
            with self.assertRaisesRegex(ValueError, "100 megapixels"):
                load_photo(io.BytesIO(b"synthetic image header"))
        header.load.assert_not_called()
        header.draft.assert_not_called()

    def test_excessive_file_bytes_are_rejected_before_header_decode(self):
        raw = b"\0" * (local_photos.MAX_PHOTO_BYTES + 1)
        with mock.patch("local_photos.Image.open", side_effect=AssertionError("Image opened")):
            with self.assertRaisesRegex(local_photos.PhotoError, "20 MiB"):
                local_photos.decode_photo(raw)

    def test_malformed_upload_reports_readable_error(self):
        with self.assertRaisesRegex(local_photos.PhotoError, "could not be read"):
            local_photos.decode_photo(b"\xff\xd8not a readable JPEG")


if __name__ == "__main__":
    unittest.main()
