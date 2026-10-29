"""Read a user's local photo folder without publishing paths or running models."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import io
import os
from pathlib import Path
import re
import stat
import warnings

from PIL import Image

from image_lab import MAX_PHOTO_BYTES, MAX_PHOTO_PIXELS, encode_input, load_photo

PHOTO_DIR = Path(__file__).resolve().parent / "user_photos"
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mpo"}
PHOTO_ID = re.compile(r"local_[0-9a-f]{64}\Z")


class PhotoError(ValueError):
    """An understandable local-file problem, without a filesystem path."""


def decode_photo(raw: bytes) -> Image.Image:
    """Validate limits before decoding/resizing an allowed primary photograph."""
    if len(raw) > MAX_PHOTO_BYTES:
        raise PhotoError("This photo is larger than 20 MiB. Export a smaller copy.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as image:
                if image.format not in {"JPEG", "MPO", "PNG", "WEBP"}:
                    raise PhotoError("Please choose a JPEG, PNG, or WebP photo.")
                if image.width * image.height > MAX_PHOTO_PIXELS:
                    raise PhotoError("This photo is larger than 100 megapixels. Export a smaller copy.")
            return load_photo(io.BytesIO(raw))
    except Image.DecompressionBombError as exc:
        raise PhotoError("This photo is larger than 100 megapixels. Export a smaller copy.") from exc
    except PhotoError:
        raise
    except (OSError, SyntaxError, ValueError, TypeError) as exc:
        raise PhotoError("This image could not be read. Export it as JPEG, PNG, or WebP.") from exc


def _identity(filename: str, raw: bytes) -> str:
    # The name distinguishes duplicate copies; changed bytes get a new identity.
    return "local_" + hashlib.sha256(os.fsencode(filename) + b"\0" + raw).hexdigest()


def _read_file(folder: Path, filename: str, folder_fd: int | None) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    path = folder / filename
    if path.is_symlink():
        raise PhotoError("Shortcuts and symbolic links are ignored. Put a copy of the photo in this folder.")
    try:
        if folder_fd is not None:
            fd = os.open(filename, flags, dir_fd=folder_fd)
        else:
            # Windows has no directory-relative os.open; the API never accepts paths.
            if path.resolve().parent != folder.resolve():
                raise PhotoError("This photo is outside the local photo folder.")
            fd = os.open(path, flags)
        with os.fdopen(fd, "rb") as stream:
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode):
                raise PhotoError("Only regular photo files are supported.")
            if info.st_size > MAX_PHOTO_BYTES:
                raise PhotoError("This photo is larger than 20 MiB. Export a smaller copy.")
            raw = stream.read(MAX_PHOTO_BYTES + 1)
        if len(raw) > MAX_PHOTO_BYTES:
            raise PhotoError("This photo is larger than 20 MiB. Export a smaller copy.")
        return raw
    except OSError as exc:
        raise PhotoError("This photo could not be opened. Check that it is a readable file in this folder.") from exc


def _candidates(folder: Path):
    if not folder.exists():
        return
    if folder.is_symlink() or not folder.is_dir():
        raise PhotoError("user_photos must be a regular folder, not a shortcut or symbolic link.")
    folder_fd = None
    if os.open in os.supports_dir_fd:
        try:
            folder_fd = os.open(folder, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
                                | getattr(os, "O_NOFOLLOW", 0))
        except OSError as exc:
            raise PhotoError("The local photo folder could not be opened.") from exc
    try:
        try:
            paths = sorted(folder.iterdir(), key=lambda path: path.name.casefold())
        except OSError as exc:
            raise PhotoError("The local photo folder could not be read.") from exc
        for path in paths:
            if path.name.startswith(".") or path.name == "README.md":
                continue
            if path.is_dir() and not path.is_symlink():
                continue
            if path.suffix.casefold() not in PHOTO_EXTENSIONS:
                yield path.name, None, "Unsupported file type. Use JPEG, PNG, or WebP."
                continue
            try:
                yield path.name, _read_file(folder, path.name, folder_fd), None
            except PhotoError as exc:
                yield path.name, None, str(exc)
    finally:
        if folder_fd is not None:
            os.close(folder_fd)


@dataclass
class LocalPhoto:
    filename: str
    raw: bytes
    image: Image.Image

    @property
    def id(self) -> str:
        return _identity(self.filename, self.raw)

    def metadata(self) -> dict:
        return {"id": self.id, "title": "Your photo · " + self.filename,
                "filename": self.filename, "width": self.image.width,
                "height": self.image.height,
                "source_sha256": hashlib.sha256(self.raw).hexdigest(),
                "image_url": "/api/photos/" + self.id,
                "result_type": "local_unanalyzed"}

    def preview(self) -> bytes:
        # Re-encoding strips EXIF/location metadata and sends only the main image.
        return encode_input(self.image)[0]


def catalog(folder: Path | None = None) -> dict:
    photos, skipped = [], []
    try:
        for filename, raw, error in _candidates(folder or PHOTO_DIR):
            if not error:
                try:
                    photo = LocalPhoto(filename, raw, decode_photo(raw))
                    photos.append(photo.metadata())
                except PhotoError as exc:
                    error = str(exc)
            if error:
                skipped.append({"filename": filename, "reason": error})
    except PhotoError as exc:
        skipped.append({"filename": "user_photos", "reason": str(exc)})
    return {"folder": "user_photos", "photos": photos, "skipped": skipped}


def find_photo(photo_id: str, folder: Path | None = None) -> LocalPhoto:
    if not isinstance(photo_id, str) or not PHOTO_ID.fullmatch(photo_id):
        raise PhotoError("Choose a photo from the local photo list.")
    for filename, raw, error in _candidates(folder or PHOTO_DIR):
        if not error and _identity(filename, raw) == photo_id:
            return LocalPhoto(filename, raw, decode_photo(raw))
    raise PhotoError("This photo changed or was removed. Refresh your photos and choose it again.")
