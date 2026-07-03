from PIL import Image
import os

src = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\extracted"
dst = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\wwwroot\images"
os.makedirs(dst, exist_ok=True)

# (source_filename, out_name, max_dimension)
jobs = [
    ("00_image0_147_1045.jpg",  "logo-ea3.png",         500),
    ("01_image1_147_1045.png",  "logo-raresca.png",     500),
    ("02_image2_147_1045.jpg",  "logo-premier.png",     500),
    ("03_image3_147_1045.png",  "logo-artisan.png",     500),
    ("04_image4_147_1045.png",  "logo-lomitos.png",     500),
    ("05_image5_147_1045.png",  "logo-supercarnes.png", 600),
    ("06_image6_147_1045.png",  "logo-pastelitos.png",  500),
    ("07_image7_147_1045.png",  "phone-profile-1.png",  900),
    ("08_image8_147_1045.png",  "stats-reels.png",      800),
    ("09_image9_147_1045.png",  "phone-profile-2.png",  900),
    ("10_image10_147_1045.png", "stats-anuncios.png",   800),
    ("11_image11_147_1045.png", "stats-resumen.png",    800),
    ("12_image12_147_1045.jpg", "stats-seguidores.png", 800),
    ("13_image13_147_1045.png", "ear-te-escuchamos.png",520),
    ("14_image14_147_1045.png", "person-hernedy.png",   760),
    ("15_image15_147_1045.png", "person-ginsa.png",     760),
]

for sfn, ofn, maxd in jobs:
    p = os.path.join(src, sfn)
    im = Image.open(p)
    im = im.convert("RGBA") if im.mode in ("RGBA", "P", "LA") else im.convert("RGB")
    w, h = im.size
    scale = min(1.0, maxd / max(w, h))
    if scale < 1.0:
        im = im.resize((max(1, int(w*scale)), max(1, int(h*scale))), Image.LANCZOS)
    outp = os.path.join(dst, ofn)
    if im.mode == "RGBA":
        im.save(outp, "PNG", optimize=True)
    else:
        # save opaque as optimized PNG too for consistency
        im.save(outp, "PNG", optimize=True)
    print(f"{ofn:26s} {w}x{h} -> {im.size[0]}x{im.size[1]}  {os.path.getsize(outp)//1024} KB")

total = sum(os.path.getsize(os.path.join(dst, f)) for f in os.listdir(dst))
print("TOTAL images:", total//1024, "KB")
