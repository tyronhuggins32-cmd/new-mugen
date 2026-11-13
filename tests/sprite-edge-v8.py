#!/usr/bin/env python3
"""Behavioral regression for Yusuke white gaps and outline cleanup."""
from pathlib import Path
from tempfile import TemporaryDirectory
import numpy as np
from PIL import Image
from tools.repair_yusuke_alpha_v8 import sanitize

with TemporaryDirectory() as d:
    source = Path(d) / "input.png"
    output = Path(d) / "output.png"
    arr = np.zeros((1024, 2048, 4), dtype=np.uint8)
    # Transparent margins surrounding dark torso.
    arr[90:250, 90:240] = (31, 46, 88, 255)
    # Pale exterior contamination around the body silhouette.
    arr[88:90, 90:240] = (253, 252, 251, 245)
    arr[90:250, 88:90] = (250, 251, 252, 235)
    # Large interior white background remnant.
    arr[147:162, 155:169] = (250, 251, 249, 255)
    # A small white eye glint should survive.
    arr[112:115, 118:121] = (245, 245, 245, 255)
    # Red/magenta generator fringe outside pants.
    arr[251:253, 112:160] = (224, 48, 150, 230)
    Image.fromarray(arr, "RGBA").save(source)
    before = Image.open(source).convert("RGBA")
    stats = sanitize(source, output, [{"x":85,"y":85,"w":170,"h":178,"ax":83}])
    after = Image.open(output).convert("RGBA")
    assert before.getpixel((110, 88))[3] > 100
    assert after.getpixel((110, 88))[3] == 0, "neutral halo should become transparent"
    assert after.getpixel((90, 150))[3] == 255, "original fighter silhouette remains"
    assert after.getpixel((159, 152))[:3] == (31, 46, 88), "white torso gap gets nearest valid color"
    assert after.getpixel((119, 113))[:3] == (245, 245, 245), "eye glints are protected"
    assert after.getpixel((135, 251))[3] == 0, "red outline is removed"
    assert stats["white_fringe"] > 0 and stats["white_gaps"] > 0
    assert stats["magenta_fringe"] > 0
print("PASS: removes white sprite outlines, repairs enclosed white gaps and preserves eye details.")
