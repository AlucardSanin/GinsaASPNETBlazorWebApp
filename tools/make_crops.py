from PIL import Image
import os

render = r"C:\Users\david\Downloads\wireframe_render.png"
outdir = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\crops"
os.makedirs(outdir, exist_ok=True)

im = Image.open(render).convert("RGB")
W, H = im.size
print("render size", W, H)

# content area: 1920 wide starting at x=574
cx0 = 574
cx1 = 574 + 1920
band = 1000
overlap = 80
y = 0
i = 0
while y < H:
    y1 = min(y + band, H)
    crop = im.crop((cx0, y, cx1, y1))
    # scale down width to <=1000 for readable token size but keep detail
    fname = os.path.join(outdir, f"band_{i:02d}_{y}-{y1}.png")
    crop.save(fname)
    print(fname, crop.size)
    i += 1
    y = y1 - overlap
    if y1 >= H:
        break

# thumbnails contact sheet of extracted images
exdir = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\extracted"
files = sorted(os.listdir(exdir))
thumbs = []
for fn in files:
    try:
        t = Image.open(os.path.join(exdir, fn)).convert("RGBA")
    except Exception as e:
        print("skip", fn, e); continue
    t.thumbnail((260, 260))
    thumbs.append((fn, t))

cols = 4
cell = 280
rows = (len(thumbs) + cols - 1)//cols
sheet = Image.new("RGBA", (cols*cell, rows*(cell+24)), (40,40,40,255))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for idx,(fn,t) in enumerate(thumbs):
    r = idx//cols; c = idx%cols
    x = c*cell + (cell-t.width)//2
    yy = r*(cell+24) + (cell-t.height)//2
    sheet.paste(t, (x, yy), t)
    d.text((c*cell+4, r*(cell+24)+cell+4), fn[:34], fill=(255,255,255,255))
sheet.convert("RGB").save(os.path.join(outdir, "_contact_sheet.png"))
print("contact sheet saved", sheet.size)
