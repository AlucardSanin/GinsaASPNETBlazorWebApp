import urllib.request, os

base = "https://www.figma.com/api/mcp/asset/"
dst = r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\wwwroot\images"
os.makedirs(dst, exist_ok=True)

assets = {
    "smile":            "84fe6d8b-3356-44dc-9491-046a9f6fc3d8",
    "creemos-juntos":   "8e6947b5-ac90-4dfe-af71-ec40c5e9962c",
    "logo-arrieta":     "9ffd45a3-415d-41a2-a6a6-95015d778715",
    "logo-agency":      "5150d900-7fb3-40d6-808f-d4827bd89a9f",
    "card-proponemos":  "edaf1acb-33b3-45b8-9466-3210e8111cc3",
    "card-creamos":     "02971d88-65c8-4de2-8bdd-61bbcdd5176b",
    "card-ejecutamos":  "600e8aca-b498-4d37-b80a-5fe5b563bd37",
    "card-medimos":     "97efd862-0e87-4d71-ad98-2298a8333091",
    "wheel-marketing":  "a5d52327-d69a-4f1c-8109-8b19536f1019",
    "wheel-social":     "ea3b4804-2edf-4e42-bf95-f995733f4f38",
    "wheel-diseno":     "e09a628b-7a38-4335-b7e7-953d822195cb",
    "button-up":        "051f9590-c879-476f-a1e5-feb13ec90ebe",
    "flag-ve":          "ef5f91bd-3aca-4c75-a6e9-dceec8ca50c9",
    "flag-co":          "adec1555-38e2-41e3-81bd-e91f580de4b7",
    "curl1":            "8cc00e7a-4056-4904-8f56-e9bc1d1dd3b1",
    "curl2":            "48fdbe0f-daab-4cfb-9113-9bfa3135d2ae",
    "curl3":            "c972dd00-e31c-429a-abff-4327a0b07730",
    "curl4":            "82ada2ac-5a46-4a50-b1ef-1214d7375f76",
    "hexagon":          "4f120360-ee36-462b-bacf-d8adb0ca8cdc",
    "quote-right":      "1dd524d0-7f67-4acd-8c32-27c084bc8626",
    "quote-curl":       "57fc2749-6f4b-4cf1-b4fe-aadbb2699e59",
    "icon-mail":        "edb13da6-e352-41b0-9ecc-b3df1e749193",
    "icon-instagram":   "3d521d4a-e662-48c2-8cee-60098213a3db",
    "icon-arrow":       "aaf6891c-288b-4118-9306-9fe5d560443d",
    "footer-smile":     "b0a8af8b-5448-44b8-a2af-da456831d795",
}

def detect_ext(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n": return "png"
    if data[:3] == b"\xff\xd8\xff": return "jpg"
    if data[:5] == b"<?xml" or data[:4] == b"<svg" or b"<svg" in data[:200]: return "svg"
    if data[:6] in (b"GIF87a", b"GIF89a"): return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP": return "webp"
    return "bin"

hdr = {"User-Agent": "Mozilla/5.0"}
results = []
for name, aid in assets.items():
    url = base + aid
    try:
        req = urllib.request.Request(url, headers=hdr)
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        ext = detect_ext(data)
        fn = os.path.join(dst, f"{name}.{ext}")
        with open(fn, "wb") as f:
            f.write(data)
        results.append(f"OK  {name}.{ext}  {len(data)//1024} KB")
    except Exception as e:
        results.append(f"ERR {name}: {e}")

print("\n".join(results))
