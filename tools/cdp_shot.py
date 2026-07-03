import json, subprocess, time, os, sys, urllib.request, tempfile, shutil
import websocket

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5283/"
OUTFILE = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\crops\app_cdp_full.png"
PORT = 9223
OUT = os.path.dirname(OUTFILE)
WIDTH = 1440

ud = tempfile.mkdtemp(prefix="cdp_")
proc = subprocess.Popen([
    CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", f"--user-data-dir={ud}",
    "--remote-allow-origins=*",
    f"--window-size={WIDTH},1400", "about:blank"
])

def http_json(path):
    for _ in range(40):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{path}", timeout=2) as r:
                return json.loads(r.read())
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("cannot reach chrome devtools")

try:
    tabs = http_json("/json")
    ws_url = None
    for t in tabs:
        if t.get("type") == "page":
            ws_url = t["webSocketDebuggerUrl"]; break
    if not ws_url:
        ws_url = http_json("/json/new")["webSocketDebuggerUrl"]

    ws = websocket.create_connection(ws_url, max_size=None)
    mid = [0]
    def cmd(method, params=None):
        mid[0] += 1
        i = mid[0]
        ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == i:
                return msg.get("result", {})

    cmd("Page.enable")
    cmd("Runtime.enable")
    cmd("Emulation.setDeviceMetricsOverride", {
        "width": WIDTH, "height": 1200, "deviceScaleFactor": 1, "mobile": False
    })
    cmd("Page.navigate", {"url": URL})
    time.sleep(5)  # allow fonts/images/render

    metrics = cmd("Page.getLayoutMetrics")
    css = metrics.get("cssContentSize") or metrics.get("contentSize")
    total_h = int(css["height"])
    total_w = int(css["width"])
    print("content size", total_w, total_h)

    # Emula un viewport tan alto como la página para disparar los
    # IntersectionObserver de todos los elementos con scroll-reveal, luego espera
    # a que terminen las transiciones antes de capturar.
    cmd("Emulation.setDeviceMetricsOverride", {
        "width": WIDTH, "height": min(total_h, 20000), "deviceScaleFactor": 1, "mobile": False
    })
    time.sleep(2.5)
    metrics = cmd("Page.getLayoutMetrics")
    css = metrics.get("cssContentSize") or metrics.get("contentSize")
    total_h = int(css["height"])

    # Full page in one shot via captureBeyondViewport
    res = cmd("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": True,
        "clip": {"x": 0, "y": 0, "width": WIDTH, "height": total_h, "scale": 1}
    })
    import base64
    data = base64.b64decode(res["data"])
    full = OUTFILE
    with open(full, "wb") as f:
        f.write(data)
    print("saved full", full, len(data)//1024, "KB")

    ws.close()
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
    shutil.rmtree(ud, ignore_errors=True)
