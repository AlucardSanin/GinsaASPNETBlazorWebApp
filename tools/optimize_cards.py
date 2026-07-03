from PIL import Image
import os
d = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\wwwroot\images"
for name in ["card-proponemos","card-creamos","card-ejecutamos","card-medimos"]:
    p = os.path.join(d, name+".png")
    im = Image.open(p).convert("RGBA")
    w,h = im.size
    scale = min(1.0, 560/max(w,h))
    if scale < 1.0:
        im = im.resize((int(w*scale), int(h*scale)), Image.LANCZOS)
    im.save(p, "PNG", optimize=True)
    print(f"{name}: {w}x{h} -> {im.size} {os.path.getsize(p)//1024} KB")
