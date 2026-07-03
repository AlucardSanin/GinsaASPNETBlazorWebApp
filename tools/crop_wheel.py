from PIL import Image
render = r"C:\Users\david\Downloads\wireframe_render.png"
im = Image.open(render).convert("RGB")
# Full content-width band containing the whole services wheel + labels
# content x: 574 .. 2494 (1920 wide). Band between title (y2808) and button (y4278).
box = (574, 3120, 2494, 4190)
crop = im.crop(box)
out = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\wwwroot\images\wheel.png"
crop.save(out)
print("saved", out, crop.size)
