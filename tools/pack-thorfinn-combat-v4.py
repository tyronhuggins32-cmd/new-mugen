#!/usr/bin/env python3
"""Pack the five user-uploaded Thorfinn combat sheets as 36 transparent cels.

No generated poses: every tile preserves a source drawing. The output is a
separate combat atlas so the previously shipped 56 movement cels remain intact.
"""
from pathlib import Path
import argparse
import numpy as np
import cv2
from PIL import Image, ImageDraw

CELL_W, CELL_H, COLS = 384, 320, 8
LAYOUT = [
    ("air_attack", "source-air-attack.jpg", 2, 2, 210),
    ("hurt", "source-hurt.jpg", 2, 2, 215),
    ("air_combo", "source-air-combo.jpg", 3, 2, 210),
    ("ground_combo", "source-ground-combo.jpg", 4, 3, 212),
    ("blade_barrage", "source-blade-barrage.jpg", 5, 2, 210),
]

def remove_white_background(crop):
    """Reject JPEG-white matte and unmatte antialiased blade/silhouette edges."""
    rgb = np.asarray(crop.convert("RGB"), dtype=np.uint8)
    divergence = (255 - rgb.min(axis=2).astype(np.int16)).astype(np.float32)
    alpha = (255 * np.clip((divergence - 12.0) / 24.0, 0, 1)).astype(np.uint8)
    foreground = (divergence > 18).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(foreground, 8)
    if count < 2:
        raise ValueError("Source cel has no drawing")
    big = int(stats[1:, cv2.CC_STAT_AREA].max())
    keep = np.zeros(foreground.shape, dtype=np.uint8)
    for idx in range(1, count):
        if int(stats[idx, cv2.CC_STAT_AREA]) >= max(75, big * .018):
            keep[labels == idx] = 255
    nearby = cv2.dilate(keep, np.ones((5, 5), np.uint8))
    alpha[nearby == 0] = 0
    alpha[alpha < 12] = 0
    alpha[alpha >= 245] = 255
    a = alpha.astype(np.float32) / 255.0
    out = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    valid = a >= .025
    for channel in range(3):
        value = rgb[:, :, channel].astype(np.float32)
        out[:, :, channel][valid] = np.clip(
            (value[valid] - 255 * (1 - a[valid])) / a[valid], 0, 255
        ).astype("uint8")
    out[:, :, 3] = alpha
    return Image.fromarray(out, "RGBA")

def extract(source, cols, rows):
    frames = []
    for row in range(rows):
        for col in range(cols):
            x0 = round(source.width * col / cols)
            x1 = round(source.width * (col + 1) / cols)
            y0 = round(source.height * row / rows)
            y1 = round(source.height * (row + 1) / rows)
            cel = remove_white_background(source.crop((x0, y0, x1, y1)))
            bounds = cel.getchannel("A").getbbox()
            if not bounds:
                raise ValueError(f"Empty source frame {row}:{col}")
            frames.append(cel.crop(bounds))
    return frames

def build(source_dir, atlas_path, preview_path=None):
    groups = []
    for name, filename, cols, rows, target_h in LAYOUT:
        source = Image.open(source_dir / filename).convert("RGB")
        sprites = extract(source, cols, rows)
        median_h = float(np.median([im.height for im in sprites]))
        scale = min(.95, target_h / median_h)
        scale = min(scale, (CELL_W - 24) / max(im.width for im in sprites))
        scale = min(scale, (CELL_H - 15) / max(im.height for im in sprites))
        groups.append((name, sprites, scale))
        print(f"{name}: {len(sprites)} cels, scale={scale:.3f}")
    count = sum(len(sprites) for _, sprites, _ in groups)
    assert count == 36
    atlas = Image.new("RGBA", (COLS * CELL_W, 5 * CELL_H))
    index = 0
    for _, sprites, scale in groups:
        for sprite in sprites:
            w = max(1, round(sprite.width * scale))
            h = max(1, round(sprite.height * scale))
            image = sprite.resize((w, h), Image.Resampling.LANCZOS)
            x = (index % COLS) * CELL_W + (CELL_W - w) // 2
            y = (index // COLS) * CELL_H + CELL_H - h
            atlas.alpha_composite(image, (x, y))
            index += 1
    assert atlas.getchannel("A").getextrema() == (0, 255)
    atlas_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(atlas_path, "WEBP", lossless=True, exact=True, method=6)
    if preview_path:
        bg = Image.new("RGBA", atlas.size, (85, 86, 88, 255))
        draw = ImageDraw.Draw(bg)
        for x in range(0, bg.width, 32):
            for y in range(0, bg.height, 32):
                if (x // 32 + y // 32) % 2 == 0:
                    draw.rectangle((x, y, x + 31, y + 31), fill=(125, 126, 128, 255))
        bg.alpha_composite(atlas)
        bg.thumbnail((1600, 1000))
        bg.convert("RGB").save(preview_path, quality=88)
    print(f"PASS: {count} transparent combat poses, {atlas.size}, {atlas_path.stat().st_size} bytes")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=Path("characters/thorfinn"))
    parser.add_argument("--output", type=Path, default=Path("characters/thorfinn/thorfinn-combat-v4.webp"))
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    build(args.source_dir, args.output, args.preview)
