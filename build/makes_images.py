"""Makes the WebP renders for the /makes/ gallery from my listing renders.

Run from anywhere:  python3 build/makes_images.py [path to digital-assets]
Writes assets/makes/<key>-1200.webp and <key>-600.webp (the hero render) and <key>-detail-600.webp.
Only needed when a model or a render changes; gen.py just links the files.
"""
from pathlib import Path
import sys
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
from makes_data import MODELS
S=Path(__file__).resolve().parent.parent
SRC=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/digital-assets')
OUT=S/'assets'/'makes'; OUT.mkdir(parents=True,exist_ok=True)
def save(src,dst,w):
  im=Image.open(src).convert('RGB'); h=round(im.height*w/im.width)
  im.resize((w,h),Image.LANCZOS).save(dst,'WEBP',quality=80,method=6)
for key,folder,*_,hero,detail in MODELS:
  c=(next(SRC.glob(folder)).parent if '*' in folder else SRC/folder)/'covers'
  save(c/f'{hero}.png',OUT/f'{key}-1200.webp',1200)
  save(c/f'{hero}.png',OUT/f'{key}-600.webp',600)
  save(c/f'{detail}.png',OUT/f'{key}-detail-600.webp',600)
print(len(MODELS),'models')
