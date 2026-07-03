import json, subprocess, time, os, sys, urllib.request, tempfile, shutil, base64
import websocket

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5283/"
OUTFILE = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\david\source\repos\GinsaASPNETBlazorWebApp\tools\crops\vp.png"
WIDTH = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
HEIGHT = int(sys.argv[4]) if len(sys.argv) > 4 else 900
WAIT = float(sys.argv[5]) if len(sys.argv) > 5 else 5.0
PORT = 9224

ud = tempfile.mkdtemp(prefix="vp_")
proc = subprocess.Popen([
    CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    f"--remote-debugging-port={PORT}", f"--user-data-dir={ud}",
    "--remote-allow-origins=*",
    f"--window-size={WIDTH},{HEIGHT}", "about:blank"
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
        "width": WIDTH, "height": HEIGHT, "deviceScaleFactor": 1, "mobile": False
    })
    cmd("Page.navigate", {"url": URL})
    time.sleep(WAIT)

    res = cmd("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": False,
        "clip": {"x": 0, "y": 0, "width": WIDTH, "height": HEIGHT, "scale": 1}
    })
    data = base64.b64decode(res["data"])
    with open(OUTFILE, "wb") as f:
        f.write(data)
    print("saved", OUTFILE, len(data)//1024, "KB")
    ws.close()
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
    shutil.rmtree(ud, ignore_errors=True)
