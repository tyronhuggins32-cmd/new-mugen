#!/usr/bin/env python3
"""Polish premium Yusuke sprites without changing anatomy, alpha bounds or pivots.
Runs on the two already-verified 2048x1024 source sheets, and produces v7 art.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import sys

SOURCE=Path(sys.argv[1] if len(sys.argv)>1 else "characters/yusuke")
DEST=Path(sys.argv[2] if len(sys.argv)>2 else "characters/yusuke")
DEST.mkdir(parents=True,exist_ok=True)
PALETTE={
    'shirt':dict(h=(21,48),s=94,v=80,target=(30,177,235),shift=.92),
    'skin':dict(h=(6,25),s=62,v=75,target=(19,132,240),shift=.83),
    'pants':dict(h=(147,205),s=25,v=22,target=(170,92,56),shift=.62),
    'wrist':dict(h=(58,144),s=45,v=28,target=(110,132,88),shift=.78),
}
ORIGIN={
    'combat':{'shirt':(32,170,224),'skin':(18,120,243),'pants':(168,91,56),'wrist':(113,139,75)},
    'movement':{'shirt':(29,183,248),'skin':(20,144,243),'pants':(171,94,55),'wrist':(108,122,98)},
}
def refine(label):
    source=SOURCE/f'yusuke-premium-{label}.png'
    img=Image.open(source).convert('RGBA')
    assert img.size==(2048,1024)
    rgb=np.asarray(img.convert('RGB')).copy()
    alpha=np.asarray(img.getchannel('A')).copy()
    hsv=np.asarray(img.convert('RGB').convert('HSV')).astype(np.float32)
    h,s,v=hsv[:,:,0],hsv[:,:,1],hsv[:,:,2]
    valid=alpha>10
    for material,sp in PALETTE.items():
        low,high=sp['h']
        margin=np.minimum(np.clip((h-low)/5,0,1),np.clip((high-h)/5,0,1))
        saturation=np.clip((s-sp['s'])/25,0,1)
        luminance=np.clip((v-sp['v'])/22,0,1)
        weight=margin*saturation*luminance*sp['shift']*valid
        if material=='wrist':
            # Restrict green adjustments to fabric, not turquoise hair glints.
            weight*=np.clip((rgb[:,:,1].astype(float)-rgb[:,:,2].astype(float)*1.04)/18,0,1)
        old=ORIGIN[label][material]
        target=sp['target']
        delta=((target[0]-old[0]+128)%256)-128
        h[:]=(h+weight*delta)%256
        s[:]=np.clip(s*(1+weight*(target[1]/old[1]-1)),0,255)
        v[:]=np.clip(v*(1+weight*(target[2]/old[2]-1)),0,255)
    refined=Image.fromarray(np.uint8(np.round(np.stack([h,s,v],axis=-1))),'HSV').convert('RGB')
    output=np.asarray(refined).copy()
    palette=np.asarray(refined.convert('HSV'))
    hue,sat,val=(palette[:,:,i] for i in range(3))
    # Suppress rare stray magenta/red fringe pixels. Never erase the alpha.
    fringe=(alpha>10)&((hue<8)|(hue>246))&(sat>115)&(val>78)
    fringe &= output[:,:,0].astype(np.int16)>output[:,:,1].astype(np.int16)*1.45
    ink=np.stack([np.clip(val*.24,14,42),np.clip(val*.31,16,47),
                  np.clip(val*.43,22,62)],axis=-1).astype(np.uint8)
    output[fringe]=ink[fringe]
    alpha[alpha<8]=0
    final=Image.fromarray(np.dstack([output,alpha]),'RGBA')
    dest=DEST/f'yusuke-premium-{label}-v7.png'
    final.save(dest,optimize=True)
    print(f"{label}: corrected {int(fringe.sum())} stray fringe pixels, saved {dest}")
for family in ('combat','movement'): refine(family)
