#!/usr/bin/env python3
"""Rebuild Yusuke's 30 authentic Square-combo cels as ONE coherent RGBA atlas.

Preserves original authored poses: jab 0-5, cross 6-11, body 12-17,
uppercut 18-29. Changes only edge cleanliness, uniform (never stretched)
body size, ground pivots and common 320x256 frame geometry.
"""
from __future__ import annotations

import json
from pathlib import Path
from statistics import median
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"characters"/"yusuke"
COMBO=ART/"yusuke_square_3hit_v32.png"
UPPER=ART/"yusuke_square_upper_v32.png"
OUTPUT=ART/"yusuke_square_master_v34_30frames.png"
META=ART/"square-combo-v34.json"
CELL_W,CELL_H,COLS=320,256,6
FOOT_Y=244
SOURCES=[
    ("light",0,6),("cross",6,12),("body",12,18),("upper",18,30)
]
def clean_edges(img: Image.Image)->tuple[Image.Image,int]:
    """Remove only transparent-adjacent saturated red matte and loose dust."""
    pix=img.load();w,h=img.size
    changed=0
    for y in range(h):
        for x in range(w):
            r,g,b,a=pix[x,y]
            if a<16:
                if a: pix[x,y]=(r,g,b,0);changed+=1
                continue
            if r>160 and r>g*1.65 and r>b*1.65 and g<120 and b<130:
                # Background fire-red fringe is not a Yusuke costume color.
                gaps=0
                for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
                    xx,yy=x+dx,y+dy
                    if not(0<=xx<w and 0<=yy<h) or pix[xx,yy][3]<24:gaps+=1
                if gaps>=1:
                    pix[x,y]=(r,g,b,0);changed+=1
    return img,changed

def bbox(img:Image.Image)->tuple[int,int,int,int]:
    alpha=img.getchannel("A")
    mask=alpha.point(lambda a:255 if a>=36 else 0)
    return mask.getbbox() or (0,0,img.width,img.height)

def main()->None:
    combo=Image.open(COMBO).convert("RGBA")
    upper=Image.open(UPPER).convert("RGBA")
    assert combo.size==(1536,768),f"unexpected combo geometry {combo.size}"
    assert upper.size==(1280,768),f"unexpected upper geometry {upper.size}"
    atlas=Image.new("RGBA",(COLS*CELL_W,5*CELL_H),(0,0,0,0))
    frames=[]
    source_heights=[]
    for i in range(30):
        if i<18:
            width=256;ci=i
            source=combo;col=ci%6;row=ci//6
            move=SOURCES[min(ci//6,2)][0]
        else:
            width=320;ci=i-18
            source=upper;col=ci%4;row=ci//4
            move="upper"
        cel=source.crop((col*width,row*256,(col+1)*width,(row+1)*256))
        cel,removed=clean_edges(cel)
        box=bbox(cel)
        height=box[3]-box[1]
        source_heights.append(height)
        frames.append([cel,move,removed])
    # A consistent full-height guard from the author's punch art, no
    # proportional stretching or exaggerated size changes.
    base=int(round(median(source_heights[:18])))
    stand_target=max(198,min(217,base))
    records=[]
    for idx,(im,move,removed) in enumerate(frames):
        original_box=bbox(im)
        content_h=original_box[3]-original_box[1]
        if idx>=26: # last four uppercut recovery poses, must match idle
            desired=stand_target
            lo,hi=.78,1.27
        elif idx<18:
            desired=stand_target
            lo,hi=.93,1.08
        else:
            # Rising poses intentionally keep their vertical reach.
            desired=content_h
            lo,hi=.95,1.05
        scale=max(lo,min(hi,desired/max(1,content_h)))
        # Uniform scale and generous source margins avoid cropping fists.
        max_width=308/max(1,original_box[2]-original_box[0])
        max_height=239/max(1,content_h)
        scale=min(scale,max_width,max_height)
        if abs(scale-1)>.002:
            im=im.resize((round(im.width*scale),round(im.height*scale)),
                         Image.Resampling.LANCZOS)
        box=bbox(im)
        # Place the visible soles on ONE game-space baseline.
        px=round(CELL_W/2 - im.width/2)
        py=round(FOOT_Y-box[3])
        # Ensure uppercut has enough room for the wide strike silhouette.
        if px+box[0]<4: px+=4-(px+box[0])
        if px+box[2]>CELL_W-4: px-=px+box[2]-(CELL_W-4)
        atlas.alpha_composite(im,(px+(idx%COLS)*CELL_W,
                                   py+(idx//COLS)*CELL_H))
        records.append({
            "index":idx,"move":move,"sourceFrame":idx if idx<18 else idx-18,
            "sourceVisibleHeight":content_h,
            "visibleHeight":box[3]-box[1],"scale":round(scale,4),
            "visibleBottom":py+box[3],
            "edgePixelsRemoved":removed,
            "source":"v32-original-hand-authored"
        })
    for i,r in enumerate(records):
        assert r["visibleBottom"]==FOOT_Y,(i,r)
    # The last four are upright recovery, never an accidental tiny fighter.
    for rec in records[-4:]:
        assert abs(rec["visibleHeight"]-stand_target)<=7,rec
    atlas.save(OUTPUT,optimize=True)
    meta={
        "formatVersion":1,"character":"Yusuke Urameshi",
        "animation":"Square Combo V34","file":OUTPUT.name,
        "width":atlas.width,"height":atlas.height,
        "columns":6,"rows":5,"cellWidth":320,"cellHeight":256,
        "frames":30,"footPivotX":160,"footPivotY":FOOT_Y,
        "background":"transparent RGBA",
        "stride":{"light":[0,5],"cross":[6,11],"body":[12,17],"upper":[18,29]},
        "recoveryVisibleHeight":stand_target,
        "notes":"Rebuilt from two original in-repo V32 animations, with uniform non-stretched scaling, common foot pivots and matte cleanup. Video used for attack order, not generated from video pixels.",
        "framesDetail":records
    }
    META.write_text(json.dumps(meta,indent=2)+"\n")
    print("V34 BUILT",OUTPUT,OUTPUT.stat().st_size,"bytes")
    print("V34 CHECK",[(x["index"],x["move"],x["visibleHeight"],x["visibleBottom"]) for x in records[-6:]])
if __name__=="__main__":
    main()
