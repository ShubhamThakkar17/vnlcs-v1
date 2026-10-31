"""Generate the two tiled board textures (each must stay under 30 KB).
Run: python3 tools/make_textures.py  (needs Pillow)"""
import random, math
from PIL import Image, ImageDraw, ImageFilter

OUT = "assets/img/"

def chalk_dust(size=256, seed=7):
    r = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # fine dust specks
    for _ in range(2600):
        x, y = r.randrange(size), r.randrange(size)
        a = r.randint(6, 26)
        d.point((x, y), fill=(243, 240, 232, a))
    # a few soft smudges (wrap-around safe: draw at offsets)
    smudge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(smudge)
    for _ in range(5):
        cx, cy = r.randrange(size), r.randrange(size)
        w, h = r.randint(40, 110), r.randint(14, 40)
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                sd.ellipse((cx + ox - w, cy + oy - h, cx + ox + w, cy + oy + h), fill=(243, 240, 232, 7))
    smudge = smudge.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(smudge, img)
    img.save(OUT + "board-chalk.webp", "WEBP", quality=60, method=6)

def marker_ghosts(size=512, seed=11):
    r = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # faint ghosts of erased marker: loose loops and scribbled words
    for _ in range(7):
        x, y = r.randrange(size), r.randrange(size)
        pts = []
        length = r.randint(5, 11)
        for i in range(length * 6):
            t = i / 6
            pts.append((x + t * r.uniform(9, 12), y + math.sin(t * 2.4 + r.random()) * r.uniform(5, 9)))
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                d.line([(px + ox, py + oy) for px, py in pts], fill=(31, 41, 55, 9), width=5, joint="curve")
    img = img.filter(ImageFilter.GaussianBlur(2.2))
    img.save(OUT + "board-marker.webp", "WEBP", quality=55, method=6)

chalk_dust()
marker_ghosts()
