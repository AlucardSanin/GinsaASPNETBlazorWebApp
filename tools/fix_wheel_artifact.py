from PIL import Image
p = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\wwwroot\images\wheel.png"
im = Image.open(p).convert("RGB")
W, H = im.size
px = im.load()

# Detect gray-ish pixels (R~=G~=B, mid value) in lower-center region only.
x0, x1 = int(W*0.32), int(W*0.55)
y0, y1 = int(H*0.62), int(H*0.90)
minx, miny, maxx, maxy = W, H, 0, 0
found = 0
for y in range(y0, y1):
    for x in range(x0, x1):
        r, g, b = px[x, y]
        if max(r, g, b) - min(r, g, b) <= 22 and 55 <= (r+g+b)//3 <= 155:
            minx = min(minx, x); maxx = max(maxx, x)
            miny = min(miny, y); maxy = max(maxy, y)
            found += 1
print("found", found, "bbox", (minx, miny, maxx, maxy))

if found > 30:
    pad = 3
    minx -= pad; maxx += pad; miny -= pad; maxy += pad
    # Inpaint each row by linear blend between the pixel just left and just right of the box.
    for y in range(miny, maxy+1):
        lx = max(0, minx-1); rx = min(W-1, maxx+1)
        lr, lg, lb = px[lx, y]; rr, rg, rb = px[rx, y]
        span = max(1, rx-lx)
        for x in range(minx, maxx+1):
            t = (x-lx)/span
            px[x, y] = (int(lr+(rr-lr)*t), int(lg+(rg-lg)*t), int(lb+(rb-lb)*t))
    im.save(p)
    print("patched and saved")
else:
    print("no artifact patch applied")
