#!/usr/bin/env python3
"""Serve project and verify modular index boots (Chrome headless)."""
from __future__ import annotations

import os
import re
import subprocess
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

ROOT = Path(__file__).resolve().parent.parent
PORT = 8767
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")


class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


def main() -> int:
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), QuietHandler)
    Thread(target=httpd.serve_forever, daemon=True).start()
    time.sleep(0.3)
    base = f"http://127.0.0.1:{PORT}"

    for path in (
        "/index.html",
        "/js/core.js",
        "/js/ui.js",
        "/js/combat.js",
        "/js/save.js",
        "/css/main.css",
        "/wow-mop-data.js",
        "/tests/browser-smoke.html",
    ):
        with urllib.request.urlopen(base + path, timeout=5) as r:
            data = r.read()
            print(f"GET {path} -> {r.status} ({len(data)} bytes)")

    if not CHROME.is_file():
        print("Chrome not found; skip headless boot")
        httpd.shutdown()
        return 0

    def dump(url: str, budget: int = 10000) -> str:
        proc = subprocess.run(
            [
                str(CHROME),
                "--headless=new",
                "--disable-gpu",
                f"--virtual-time-budget={budget}",
                "--dump-dom",
                url,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=90,
        )
        return proc.stdout or ""

    smoke_dom = dump(f"{base}/tests/browser-smoke.html", 8000)
    smoke_ok = 'data-status="OK"' in smoke_dom or "SMOKE_OK" in smoke_dom
    print("balance smoke:", "OK" if smoke_ok else "FAIL")

    index_dom = dump(f"{base}/index.html", 12000)
    if "WOW_MOP missing" in index_dom or "Не загрузился" in index_dom:
        print("BOOT_FAIL: WOW_MOP")
        httpd.shutdown()
        return 1
    if "Ошибка:" in index_dom:
        m = re.search(r"Ошибка:([^<]+)", index_dom)
        print("BOOT_FAIL:", (m.group(1) if m else "error").strip())
        httpd.shutdown()
        return 1

    m = re.search(r'id="class-grid"[^>]*>([\s\S]*?)</div>', index_dom)
    inner = (m.group(1) if m else "").strip()
    print("class-grid inner chars:", len(inner))
    boot_ok = len(inner) > 40
    print("BOOT:", "OK" if boot_ok else "FAIL (empty class grid)")
    if not boot_ok:
        # Help debug: show script errors if body replaced
        print(index_dom[:1200])

    httpd.shutdown()
    return 0 if smoke_ok and boot_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
