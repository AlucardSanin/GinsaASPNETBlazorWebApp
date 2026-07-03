import re, collections, sys

path = r"C:\Users\david\Downloads\wireframe v1.svg"

tag_counts = collections.Counter()
font_families = collections.Counter()
image_infos = []
text_samples = []

# Stream through file to avoid loading 88MB into structures repeatedly
tag_re = re.compile(r"<(\w+)")
font_re = re.compile(r'font-family="([^"]+)"')
# capture <image ...> opening tags (attrs before base64 href hopefully)
with open(path, "r", encoding="utf-8", errors="replace") as f:
    data = f.read()

for m in tag_re.finditer(data):
    tag_counts[m.group(1)] += 1

for m in font_re.finditer(data):
    font_families[m.group(1)] += 1

# text elements content
for m in re.finditer(r"<text[^>]*>(.*?)</text>", data, re.S):
    txt = re.sub(r"<[^>]+>", "", m.group(1)).strip()
    if txt:
        text_samples.append(txt[:120])

# image tags: capture attributes up to href
for m in re.finditer(r"<image\b([^>]*?)(?:xlink:href|href)=", data):
    attrs = m.group(1)
    w = re.search(r'width="([^"]+)"', attrs)
    h = re.search(r'height="([^"]+)"', attrs)
    x = re.search(r'x="([^"]+)"', attrs)
    y = re.search(r'y="([^"]+)"', attrs)
    tr = re.search(r'transform="([^"]+)"', attrs)
    image_infos.append((
        x.group(1) if x else "",
        y.group(1) if y else "",
        w.group(1) if w else "",
        h.group(1) if h else "",
        tr.group(1) if tr else "",
    ))

# detect image formats in hrefs
fmt_counts = collections.Counter()
for m in re.finditer(r'(?:xlink:href|href)="data:image/([^;]+);base64,', data):
    fmt_counts[m.group(1)] += 1

print("=== TAG COUNTS ===")
for t,c in tag_counts.most_common():
    print(f"{t}: {c}")
print("\n=== FONT FAMILIES ===")
for fam,c in font_families.most_common():
    print(f"{fam}: {c}")
print("\n=== TEXT SAMPLES (count=%d) ===" % len(text_samples))
for t in text_samples[:60]:
    print("-", t)
print("\n=== EMBEDDED IMAGE FORMATS ===")
for fmt,c in fmt_counts.most_common():
    print(f"{fmt}: {c}")
print("\n=== IMAGE POSITIONS (count=%d) ===" % len(image_infos))
for i,info in enumerate(image_infos[:80]):
    print(i, "x=%s y=%s w=%s h=%s transform=%s" % info)
