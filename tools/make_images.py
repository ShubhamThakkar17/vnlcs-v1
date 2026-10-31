"""Convert the school's own photos (from the old site) to AVIF + WebP at two widths.
Usage: python3 -I tools/make_images.py <source-dir>
Output: assets/img/photos/<name>-<w>.<ext>. Alt text lives in the HTML, not here."""
import sys, os
from PIL import Image, ImageOps, ImageEnhance

SRC = sys.argv[1]
OUT = "assets/img/photos"
os.makedirs(OUT, exist_ok=True)

# name: (old-site file, crop box as fractions or None)
PHOTOS = {
    "preprimary-play":   ("1420616981-601x398.jpg", None),
    "library":          ("1420616883-601x398.jpg", None),
    "sports-ground":    ("1420617072-261x173.jpg", None),
    "preprimary-class": ("1424260338-569x379.jpg", None),
    "primary-class":    ("1424260407-569x379.jpg", None),
    "middle-class":     ("1424339112-569x379.jpg", None),
    "senior-whiteboard":("1424339052-569x379.jpg", None),
    "secondary-study":  ("1424339774-569x379.jpg", None),
    "art-class":        ("1424339916-569x379.jpg", None),
    "rangoli":          ("1424339527-569x379.jpg", None),
    "festival":         ("1424339574-569x379.jpg", None),
    "sports-parade":    ("1424339655-569x379.jpg", None),
    "campus-assembly":  ("1424340192-505x379.jpg", None),
    "janmashtami":      ("1424341428-569x379.jpg", None),
    "green-day":        ("1424341583-600x338.jpg", None),
    "christmas":        ("1424342715-505x379.jpg", None),
    "sports-day":       ("1424343504-569x379.jpg", None),
    "physics-lab":      ("lab-2-657x314.jpg", None),
    "science-lab":      ("lab-3-657x314.jpg", None),
    "reading-room":     ("library-1-657x314.jpg", None),
    "senior-group":     ("1424339485-569x379.jpg", None),
}

for name, (src, _) in PHOTOS.items():
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    im = ImageOps.autocontrast(im, cutoff=0.5)
    im = ImageEnhance.Sharpness(im).enhance(1.15)
    for w in (320, 560):
        if im.width < w * 0.9 and w != 320:
            w = im.width
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS)
        r.save(f"{OUT}/{name}-{w}.webp", "WEBP", quality=72, method=6)
        r.save(f"{OUT}/{name}-{w}.avif", "AVIF", quality=55)
    print(name, im.size)

# Write intrinsic sizes so HTML can set width/height (prevents layout shift)
import json, glob
manifest = {}
for f in sorted(glob.glob(f"{OUT}/*.webp")):
    base = os.path.basename(f)[:-5]
    name, w = base.rsplit("-", 1)
    with Image.open(f) as im:
        manifest.setdefault(name, {})[w] = list(im.size)
json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
