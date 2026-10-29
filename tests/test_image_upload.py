"""Upload decoding regressions, using generated images rather than user photos."""
import io
import unittest

from PIL import Image

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


if __name__ == "__main__":
    unittest.main()
