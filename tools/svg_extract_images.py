import re, base64, os

path = r"C:\Users\david\Downloads\wireframe v1.svg"
outdir = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\extracted"
os.makedirs(outdir, exist_ok=True)

with open(path, "r", encoding="utf-8", errors="replace") as f:
    data = f.read()

ext_map = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif", "webp": "webp"}

# Map pattern id -> image id via <use xlink:href="#imageN"> inside <pattern>
# First, capture <image id="imageN_..." width= height= href=data:...>
idx = 0
results = []
for m in re.finditer(r'<image\b([^>]*?)(?:xlink:href|href)="data:image/([^;]+);base64,([^"]+)"', data):
    attrs, fmt, b64 = m.group(1), m.group(2), m.group(3)
    idm = re.search(r'id="([^"]+)"', attrs)
    wm = re.search(r'width="([^"]+)"', attrs)
    hm = re.search(r'height="([^"]+)"', attrs)
    img_id = idm.group(1) if idm else f"img{idx}"
    ext = ext_map.get(fmt.lower(), "png")
    fname = f"{idx:02d}_{img_id}.{ext}"
    raw = base64.b64decode(b64)
    with open(os.path.join(outdir, fname), "wb") as out:
        out.write(raw)
    results.append((idx, img_id, fmt, wm.group(1) if wm else "", hm.group(1) if hm else "", len(raw), fname))
    idx += 1

for r in results:
    print("idx=%d id=%s fmt=%s w=%s h=%s bytes=%d file=%s" % r)
print("Total:", len(results))
