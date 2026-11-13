#!/usr/bin/env python3
"""Reproducibly pack eight Yusuke Power Kick cels from the approved transparent sheet."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
if len(sys.argv) != 3:
    raise SystemExit("Usage: python tools/pack-yusuke-kick.py SOURCE.png OUTPUT.png")
SOURCE=Path(sys.argv[1])
OUTPUT=Path(sys.argv[2])
COLS,ROWS=4,2
CELL_W,CELL_H=384,256
SCALE=0.53
BASE=241
PIVOTS=[.51,.35,.30,.29,.25,.24,.32,.52]
TARGETS={'shirt':(30,172,246),'skin':(20,151,215),'pants':(157,160,87),'wrist':(135,121,72)}
FRAMES=[
 (120,58,144,183,73),(515,51,121,190,42),(899,40,122,201,37),
 (1252,45,183,196,53),(84,298,215,199,54),(477,295,197,202,47),
 (903,295,114,202,36),(1269,305,149,192,77)
]

def match_palette(sprite):
    im=sprite.convert('RGBA')
    pixels=np.array(im.convert('RGB').convert('HSV')).astype(np.float32)
    valid=np.asarray(im.getchannel('A'))>90
    h,s,v=pixels[:,:,0],pixels[:,:,1],pixels[:,:,2]
    materials={
        'shirt':valid&(h>=24)&(h<=47)&(s>78)&(v>60),
        'skin':valid&(h>=5)&(h<24)&(s>72)&(v>83),
        'pants':valid&(h>=137)&(h<=205)&(s>55)&(v>24),
        'wrist':valid&(h>=78)&(h<137)&(s>67)&(v>27),
    }
    for name,mask in materials.items():
        if np.count_nonzero(mask)<12:
            continue
        original=np.median(pixels[mask],axis=0)
        target=np.asarray(TARGETS[name],float)
        hue=((target[0]-original[0]+128)%256)-128
        pixels[:,:,0][mask]=(pixels[:,:,0][mask]+.85*hue)%256
        pixels[:,:,1][mask]=np.clip(pixels[:,:,1][mask]*np.clip(target[1]/max(1.,original[1]),.7,1.3),0,255)
        pixels[:,:,2][mask]=np.clip(pixels[:,:,2][mask]*np.clip(target[2]/max(1.,original[2]),.7,1.35),0,255)
    out=Image.fromarray(np.uint8(np.round(pixels)),'HSV').convert('RGBA')
    out.putalpha(im.getchannel('A'))
    return out

source=Image.open(SOURCE).convert('RGBA')
w,h=source.size
assert 1700 <= w <= 1900 and 850 <= h <= 1000, (w,h)
atlas=Image.new('RGBA',(CELL_W*COLS,CELL_H*ROWS),(0,0,0,0))
for i in range(8):
    col,row=i%COLS,i//COLS
    tile=source.crop((round(col*w/COLS),round(row*h/ROWS),round((col+1)*w/COLS),round((row+1)*h/ROWS)))
    alpha=np.asarray(tile.getchannel('A'))
    yy,xx=np.where(alpha>48)
    if len(xx)<200: raise ValueError("Empty sprite frame "+str(i))
    crop=tile.crop((max(0,int(xx.min())-1),max(0,int(yy.min())-1),
        min(tile.width,int(xx.max())+2),min(tile.height,int(yy.max())+2)))
    crop=match_palette(crop)
    new_w,new_h=round(crop.width*SCALE),round(crop.height*SCALE)
    if new_w>=CELL_W or new_h>BASE: raise ValueError("Oversized frame "+str(i))
    (x,y,fw,fh,ax)=FRAMES[i]
    if new_w!=fw or new_h!=fh: raise ValueError(f"Frame {i} unexpected size {(new_w,new_h)} != {(fw,fh)}")
    sprite=crop.resize((new_w,new_h),Image.Resampling.LANCZOS)
    ox=col*CELL_W+(CELL_W-new_w)//2
    oy=row*CELL_H+BASE-new_h
    if ox!=x or oy!=y or round(new_w*PIVOTS[i])!=ax:
        raise ValueError(f"Frame {i} alignment mismatch")
    atlas.alpha_composite(sprite,(ox,oy))
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
atlas.save(OUTPUT,optimize=True)
print("Power Kick: 8 transparent 16-bit-style cels, standardized 1536x512 atlas")
