#!/usr/bin/env python3
"""Rebuild premium Yusuke v8 PNGs with neutral background and halo removed.

Keeps all existing pivots and frame bounds; never rescales bodies or reauthors
their anatomy. Processes each frame independently to avoid sprite bleeding.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, label

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "characters/yusuke/premium-atlas.json"


def sanitize(source: Path, target: Path, frames: list[dict]) -> dict:
    image = Image.open(source).convert("RGBA")
    assert image.size == (2048, 1024)
    raw = np.array(image)
    stats = {"white_fringe": 0, "white_gaps": 0, "magenta_fringe": 0, "cutoff": 0}
    for frame in frames:
        x, y, width, height = [int(frame[k]) for k in ("x", "y", "w", "h")]
        cel = raw[y:y+height, x:x+width].copy()
        rgb = cel[:, :, :3].astype(np.int16)
        alpha = cel[:, :, 3].copy()
        solid = alpha >= 28
        edge_distance = distance_transform_edt(solid)
        low = rgb.min(axis=2)
        high = rgb.max(axis=2)
        chroma = high - low
        neutral_white = (low >= 212) & (chroma <= 32) & (alpha >= 24)
        clear_edge = neutral_white & (edge_distance <= 3.5)
        stats["white_fringe"] += int(clear_edge.sum())
        alpha[clear_edge] = 0
        # Larger white enclosed patches are generator background remnants,
        # not shirt material. Repair with neighboring solid sprite colors.
        interior_white = neutral_white & (edge_distance > 3.5)
        components, count = label(interior_white)
        fill = np.zeros_like(interior_white)
        for component_id in range(1, count + 1):
            comp = components == component_id
            if comp.sum() >= 28:
                fill |= comp
        if fill.any():
            nearest = distance_transform_edt(fill, return_distances=False, return_indices=True)
            cel[fill, :3] = cel[nearest[0][fill], nearest[1][fill], :3]
            alpha[fill] = 255
            stats["white_gaps"] += int(fill.sum())
        # Edge pixels tinted magenta/red by image-generation mattes.
        magenta = ((rgb[:, :, 0] > 148) & (rgb[:, :, 0] > 1.52*rgb[:, :, 1])
                   & (rgb[:, :, 2] > 1.12*rgb[:, :, 1])
                   & (edge_distance <= 3.2) & (alpha > 0))
        stats["magenta_fringe"] += int(magenta.sum())
        alpha[magenta] = np.minimum(alpha[magenta], 20)
        # Almost transparent edge noise becomes a true zero-alpha pixel.
        cutoff = (alpha < 26)
        stats["cutoff"] += int((cutoff & (alpha > 0)).sum())
        alpha[cutoff] = 0
        cel[:, :, 3] = alpha
        cel[alpha == 0, :3] = 0
        raw[y:y+height, x:x+width] = cel
    # The empty atlas cells must also be fully alpha-clear.
    rgba = Image.fromarray(raw, "RGBA")
    target.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(target, optimize=True)
    assert rgba.getbbox()
    return stats


def main() -> None:
    data = json.loads(MANIFEST.read_text())
    assert data["version"] in (3, 4)
    hashes = {}
    for kind in ("combat", "movement"):
        original = ROOT / data[kind]["src"]
        if not original.exists():
            # Safe to rerun if the source name already points to v8.
            original = ROOT / f"characters/yusuke/yusuke-premium-{kind}-v7.png"
        out = ROOT / f"characters/yusuke/yusuke-premium-{kind}-v8.png"
        result = sanitize(original, out, data[kind]["frames"])
        hashes[kind] = hashlib.sha256(out.read_bytes()).hexdigest()
        data[kind]["src"] = str(out.relative_to(ROOT))
        print(kind, result, hashes[kind])
    data["version"] = 4
    data.setdefault("refinement", {})["edgeCleanup"] = (
        "V8 alpha matte: bright near-edge contamination removed, "
        "large enclosed white remnants repaired, magenta halos suppressed"
    )
    data["refinement"]["sha256"] = hashes
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n")
    print("Wrote clean V8 art and retained all original pose pivots")


if __name__ == "__main__":
    main()
