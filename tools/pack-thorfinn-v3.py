#!/usr/bin/env python3
"""Pack creator-provided Thorfinn poses into one transparent, foot-aligned atlas.

40 original cels (8x5) + 8 authored jump poses + 8 authored crouch-walk poses.
Uses the actual uploaded images without AI redraws or substituted poses.
"""
from pathlib import Path
from PIL import Image
import argparse

COLS, CELL_W, CELL_H, ORIGINAL = 8, 256, 280, 40
JUMP_HEIGHT = [146, 180, 192, 196, 192, 192, 166, 190]
CROUCH_HEIGHT = [159, 158, 155, 156, 154, 155, 158, 160]


def clean_alpha(image):
    """Discard invisible matte fringe, normalize near-opaque pixels, keep AA."""
    image = image.convert("RGBA")
    cleaned = []
    for r, g, b, a in image.getdata():
        if a < 14:
            cleaned.append((0, 0, 0, 0))
        elif a >= 242:
            cleaned.append((r, g, b, 255))
        elif min(r, g, b) > 235 and max(r, g, b) - min(r, g, b) < 25 and a < 205:
            # Pale fringe left by white-matte extraction is not costume detail.
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, round((a - 14) * 255 / (242 - 14))))
    image.putdata(cleaned)
    return image


def pack(original, jump, crouch):
    assert original.size == (2048, 1400), f"Base atlas must be 2048x1400, got {original.size}"
    for label, sheet in (("jump", jump), ("crouch", crouch)):
        assert sheet.size == (2048, 448), f"{label} sheet must be 2048x448, got {sheet.size}"

    result = Image.new("RGBA", (2048, 1960), (0, 0, 0, 0))
    for frame in range(ORIGINAL):
        x, y = (frame % COLS) * CELL_W, (frame // COLS) * CELL_H
        existing = original.crop((x, y, x + CELL_W, y + CELL_H))
        result.alpha_composite(clean_alpha(existing), (x, y))

    for row, (sheet, heights) in enumerate(((jump, JUMP_HEIGHT), (crouch, CROUCH_HEIGHT)), start=5):
        for column, desired_h in enumerate(heights):
            src = sheet.crop((column * CELL_W, 0, (column + 1) * CELL_W, 448))
            # Source is transparent; isolate artwork without treating the
            # generous pose-specific white space as body height.
            bbox = src.getchannel("A").point(lambda alpha: 255 if alpha >= 18 else 0).getbbox()
            if not bbox:
                raise ValueError(f"Empty {row=} {column=} frame")
            cropped = src.crop(bbox)
            new_w = round(cropped.width * desired_h / cropped.height)
            if new_w > 236:
                desired_h = round(desired_h * 236 / new_w)
                new_w = 236
            sprite = clean_alpha(cropped.resize((new_w, desired_h), Image.Resampling.LANCZOS))
            # Foot-aligned art: physics provides jump height, not the
            # varying vertical position baked into source-sheet rows.
            dst_x = column * CELL_W + (CELL_W - new_w) // 2
            dst_y = row * CELL_H + CELL_H - desired_h
            result.alpha_composite(sprite, (dst_x, dst_y))

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", default="characters/thorfinn/user-sprites.webp")
    parser.add_argument("--jump", default="characters/thorfinn/source-jump-8frames.png")
    parser.add_argument("--crouch", default="characters/thorfinn/source-crouch-walk-8frames.png")
    parser.add_argument("--output", default="characters/thorfinn/thorfinn-atlas-v3.webp")
    args = parser.parse_args()
    atlas = pack(
        Image.open(args.original).convert("RGBA"),
        Image.open(args.jump).convert("RGBA"),
        Image.open(args.crouch).convert("RGBA"),
    )
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(path, "WEBP", lossless=True, method=6, exact=True)
    assert atlas.getpixel((2047, 1959))[3] == 0, "Unexpected visible border"
    print(f"Wrote {path} | {atlas.size} | 56 alpha-clean cels | {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
