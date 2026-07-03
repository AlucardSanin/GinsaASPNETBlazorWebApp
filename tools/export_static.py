"""Export the landing page as a static site for Netlify / GitHub Pages."""
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLISH = os.path.join(ROOT, "artifacts", "publish")
DIST = os.path.join(ROOT, "dist")
EXE = os.path.join(PUBLISH, "GinsaASPNETBlazorWebApp.exe")
PORT = 5055
URL = f"http://127.0.0.1:{PORT}/"


def run(cmd, **kwargs):
    print("+", " ".join(cmd) if isinstance(cmd, list) else cmd)
    subprocess.run(cmd, cwd=ROOT, check=True, **kwargs)


def wait_server():
    for _ in range(60):
        try:
            with urllib.request.urlopen(URL, timeout=2) as r:
                if r.status == 200:
                    return r.read()
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("App did not start in time")


def main():
    if not os.path.isfile(EXE):
        run(["dotnet", "publish", "-c", "Release", "-o", PUBLISH])
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST, exist_ok=True)

    env = os.environ.copy()
    env["ASPNETCORE_URLS"] = f"http://127.0.0.1:{PORT}"
    proc = subprocess.Popen([EXE], cwd=PUBLISH, env=env)
    try:
        html = wait_server()
        with open(os.path.join(DIST, "index.html"), "wb") as f:
            f.write(html)

        www = os.path.join(PUBLISH, "wwwroot")
        for name in os.listdir(www):
            src = os.path.join(www, name)
            dst = os.path.join(DIST, name)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)

        # SPA-style fallback for direct section links
        shutil.copy2(os.path.join(DIST, "index.html"), os.path.join(DIST, "404.html"))

        print(f"Exported static site to {DIST}")
        print(f"  index.html: {len(html) // 1024} KB")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
