from PIL import Image
render = r"C:\Users\david\Downloads\wireframe_render.png"
im = Image.open(render).convert("RGB")
# Cards region full width
crop = im.crop((0, 4850, 3306, 5620))
crop.save(r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\crops\cards_full.png")
print("saved", crop.size)
# Also services wheel full width
w2 = im.crop((0, 2900, 3306, 4700))
w2.thumbnail((1600,1600))
w2.save(r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\crops\wheel_full.png")
print("saved wheel", w2.size)
