"""Consistent product photos: make black photo backgrounds transparent.

About three quarters of the catalogue photos sit on black (a full black
background, or black bars at the sides); the rest are on white. This makes
cleaned copies where every black area connected to the photo's edge becomes
transparent, plus enclosed pure-black gaps (e.g. between an arm and the body),
with a smoothed, faded edge around the garment. Dark hood linings and fabric
shadows are kept: gaps must be pure, colourless black below the hood area. White
backgrounds are left as they are (the site's frames blend white into ivory), so
every product ends up on the same ivory background.

The original files in data/products/ are never changed. Cleaned copies go to
data/products_clean/<name>.webp (WebP keeps transparency at a fraction of PNG size) and are rebuilt when an original is newer.

Run by itself to rebuild everything:

    python images.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from db import DATA_DIR

SOURCE_DIR = DATA_DIR / "products"
CLEAN_DIR = DATA_DIR / "products_clean"

# A pixel counts as background black when every channel is below this.
BLACK_MAX = 20
# Flood-fill tolerance from the seed colour. Kept low because some navy
# garments have near-black shadows; at 40 the fill leaked into one navy hoodie.
FILL_THRESHOLD = 12
# Fringe pixels darker than this (max channel) next to the background fade out.
FRINGE_MAX = 90
# Enclosed gaps (e.g. between an arm and the body) are background too when they
# are pure, colourless black, at least GAP_MIN_WIDTH pixels across, and not in
# the top GAP_MIN_CENTRE_Y share of the photo (where dark hood linings are).
GAP_BLACK_MAX = 14
GAP_MAX_CHROMA = 5
GAP_MIN_WIDTH = 5
GAP_MIN_CENTRE_Y = 0.35
# Real background is pure black; deep fabric shadows are noisier. A patch
# counts as a gap only if this share of it is at most GAP_PURE_MAX bright.
GAP_PURE_MAX = 4
GAP_PURE_SHARE = 0.8
# Each found gap then grows into touching dark, colourless pixels (its narrow
# ends and its dark edge), up to GAP_GROW_STEPS pixels.
GAP_EDGE_MAX = 40
GAP_EDGE_CHROMA = 10
GAP_GROW_STEPS = 6
SENTINEL = (255, 0, 255)


def clean_path(image_file_path: str) -> Path:
    """Where the cleaned copy of a catalogue image lives."""
    return CLEAN_DIR / (Path(image_file_path).stem + ".webp")


def needs_cleaning(rgb: np.ndarray) -> bool:
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    return bool((border.max(axis=1) < BLACK_MAX).mean() > 0.05)


def remove_black_background(source: Path) -> Image.Image | None:
    """Return an RGBA image with edge-connected black made transparent, or
    None if the photo has no black background."""
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image)
    if not needs_cleaning(rgb):
        return None

    # Flood-fill every dark region touching the border with a sentinel colour.
    filled = image.copy()
    height, width = rgb.shape[:2]
    border_points = (
        [(x, 0) for x in range(width)]
        + [(x, height - 1) for x in range(width)]
        + [(0, y) for y in range(height)]
        + [(width - 1, y) for y in range(height)]
    )
    for x, y in border_points:
        pixel = filled.getpixel((x, y))
        if pixel != SENTINEL and max(pixel) < BLACK_MAX:
            ImageDraw.floodfill(filled, (x, y), SENTINEL, thresh=FILL_THRESHOLD)

    background = np.all(np.asarray(filled) == SENTINEL, axis=2)
    background |= enclosed_gaps(rgb, background)

    # Smooth the cut-out edge: grow the background by one pixel to swallow the
    # compression specks along the old black edge, then soften it slightly so
    # the outline is anti-aliased rather than jagged.
    mask = Image.fromarray((background * 255).astype(np.uint8), "L")
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = 255 - np.asarray(mask).astype(np.float32)

    # Fade the remaining dark fringe in proportion to how dark it is, so no
    # black outline remains.
    near = np.asarray(Image.fromarray((background * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(5))) > 0
    fringe = near & ~background
    brightness = rgb.max(axis=2).astype(np.float32)
    fade = np.clip((brightness - BLACK_MAX) / (FRINGE_MAX - BLACK_MAX), 0, 1) * 255
    alpha[fringe] = np.minimum(alpha[fringe], fade[fringe])

    rgba = np.dstack([rgb, alpha.astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def enclosed_gaps(rgb: np.ndarray, background: np.ndarray) -> np.ndarray:
    """Black background patches enclosed by the garment (under the arms,
    between sleeves), which the edge flood fill cannot reach."""
    brightest = rgb.max(axis=2).astype(int)
    chroma = brightest - rgb.min(axis=2).astype(int)
    candidate = (brightest <= GAP_BLACK_MAX) & (chroma <= GAP_MAX_CHROMA) & ~background
    # Opening (erode then dilate) drops specks and thin shadow lines.
    mask = Image.fromarray((candidate * 255).astype(np.uint8), "L")
    size = GAP_MIN_WIDTH
    mask = mask.filter(ImageFilter.MinFilter(size)).filter(ImageFilter.MaxFilter(size))
    opened = np.asarray(mask) > 0

    # Keep each connected patch only if its centre is below the hood/neck area.
    gaps = np.zeros_like(opened)
    labels = mask.copy()
    height = rgb.shape[0]
    for y, x in zip(*np.nonzero(opened)):
        if labels.getpixel((int(x), int(y))) != 255:
            continue
        ImageDraw.floodfill(labels, (int(x), int(y)), 128)
        region = np.asarray(labels) == 128
        low_enough = np.nonzero(region)[0].mean() >= GAP_MIN_CENTRE_Y * height
        pure = (brightest[region] <= GAP_PURE_MAX).mean() >= GAP_PURE_SHARE
        if low_enough and pure:
            gaps |= region
        labels.paste(64, mask=Image.fromarray((region * 255).astype(np.uint8), "L"))
    gaps &= candidate

    # Grow into the gaps' narrow ends and dark edges, but only through dark,
    # colourless pixels, so navy or gray fabric is never touched.
    edge_ok = (brightest <= GAP_EDGE_MAX) & (chroma <= GAP_EDGE_CHROMA) & ~background
    for _ in range(GAP_GROW_STEPS):
        grown = Image.fromarray((gaps * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(3))
        gaps = (np.asarray(grown) > 0) & edge_ok
    return gaps


def ensure_clean_images() -> int:
    """Create or refresh cleaned copies; returns how many were (re)built."""
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    built = 0
    for source in sorted(SOURCE_DIR.glob("*.jpg")):
        target = CLEAN_DIR / (source.stem + ".webp")
        if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            continue
        cleaned = remove_black_background(source)
        if cleaned is not None:
            cleaned.save(target, "WEBP", quality=90, method=6)
            built += 1
        elif target.exists():
            target.unlink()
    return built


if __name__ == "__main__":
    print(f"Cleaned {ensure_clean_images()} photos into {CLEAN_DIR}")
