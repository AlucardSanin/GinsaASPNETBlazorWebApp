import math
cx = cy = 60; R = 58; r = 29; n = 12
pts = []
for i in range(n * 2):
    ang = math.pi * i / n - math.pi / 2
    rad = R if i % 2 == 0 else r
    pts.append((round(cx + rad * math.cos(ang), 1), round(cy + rad * math.sin(ang), 1)))
d = "M " + " L ".join(f"{x} {y}" for x, y in pts) + " Z"
svg = (
    '<svg width="100%" height="100%" viewBox="0 0 120 120" fill="none" '
    'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" '
    'style="display:block;overflow:visible">\n'
    f'  <path d="{d}" fill="#FF2E2E"/>\n</svg>\n'
)
with open(r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\wwwroot\images\burst-red.svg", "w", encoding="utf-8") as f:
    f.write(svg)
print("saved burst-red.svg")
