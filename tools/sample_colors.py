from PIL import Image
render = r"C:\Users\david\Downloads\wireframe_render.png"
im = Image.open(render).convert("RGB")

def avg(box):
    c = im.crop(box)
    px = list(c.getdata())
    n = len(px)
    r = sum(p[0] for p in px)//n
    g = sum(p[1] for p in px)//n
    b = sum(p[2] for p in px)//n
    return "#%02X%02X%02X" % (r,g,b)

swatches = {
 "navy_top_nav":      (1400, 5, 1600, 40),
 "hero_headline_bg":  (1400, 780, 1600, 820),
 "hero_bottom_mid":   (1400, 950, 1600, 990),
 "cyan_bottom_right": (2380, 900, 2470, 970),
 "yellow_button":     (2170, 22, 2250, 52),
 "purple_hexagon":    (790, 360, 860, 410),
 "quotes_blob_tr":    (2380, 180, 2460, 250),
 "hola_section_bg":   (700, 1200, 900, 1260),
 "grey_bg_light":     (900, 2300, 1100, 2400),
 "green_social":      (1500, 4180, 1560, 4230),
 "red_diseno":        (1500, 4320, 1560, 4360),
 "process_dark_bg":   (900, 5000, 1100, 5100),
 "yellow_card":       (900, 5300, 1000, 5350),
 "logos_blue_bg":     (900, 6050, 1100, 6150),
 "creemos_bg":        (900, 8600, 1100, 8700),
 "creemos_purple":    (1350, 8500, 1420, 8560),
 "creemos_yellow":    (1450, 8600, 1520, 8650),
 "footer_bg":         (1400, 9350, 1600, 9450),
}
for name, box in swatches.items():
    try:
        print(f"{name:20s} {avg(box)}  box={box}")
    except Exception as e:
        print(name, "ERR", e)

print("\n-- hero vertical gradient center column x=1534 --")
for y in range(0, 1024, 80):
    print(y, "#%02X%02X%02X" % im.getpixel((1534, y)))
