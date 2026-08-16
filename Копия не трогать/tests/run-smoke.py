#!/usr/bin/env python3
"""Run structural + balance smoke checks (no Node required)."""
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
fails: list[str] = []


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def bad(msg: str) -> None:
    fails.append(msg)
    print(f"  ✗ {msg}")


def load_check() -> None:
    print("[load-check] structure")
    required = [
        "index.html",
        "css/main.css",
        "js/core.js",
        "js/enemies.js",
        "js/route.js",
        "js/gear.js",
        "js/combat.js",
        "js/save.js",
        "js/ui.js",
        "wow-mop-data.js",
        "class-balance/apply-all.js",
    ]
    for rel in required:
        p = ROOT / rel
        if p.is_file():
            ok(rel)
        else:
            bad(f"missing {rel}")

    print("[load-check] index wiring")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    if "css/main.css" in index:
        ok("css link")
    else:
        bad("index missing css/main.css")
    for name in ("core", "enemies", "route", "gear", "combat", "save", "ui"):
        if f"js/{name}.js" in index:
            ok(f"script {name}.js")
        else:
            bad(f"index missing js/{name}.js")
    if "<style>" in index:
        bad("index still has inline <style>")
    else:
        ok("no inline style")
    if len(index) > 80_000:
        bad(f"index.html still huge ({len(index)} chars)")
    else:
        ok(f"index.html size ok ({len(index)} chars)")

    print("[load-check] module symbols")
    checks = [
        ("js/core.js", "PATCHED_SPECS"),
        ("js/enemies.js", "const ENEMIES"),
        ("js/enemies.js", "const AFFIXES"),
        ("js/route.js", "const DUNGEONS"),
        ("js/route.js", "function generateRoute"),
        ("js/gear.js", "function emptyGear"),
        ("js/gear.js", "function generateGearItem"),
        ("js/combat.js", "function startCombat"),
        ("js/combat.js", "function castAbility"),
        ("js/save.js", "function serializeRun"),
        ("js/save.js", "function exportSaveFile"),
        ("js/ui.js", "function initLobby"),
        ("js/ui.js", "initLobby()"),
        ("class-balance/apply-all.js", "CLASS_BALANCE_API"),
        ("class-balance/apply-all.js", "function normalizePack"),
    ]
    for rel, needle in checks:
        text = (ROOT / rel).read_text(encoding="utf-8")
        if needle in text:
            ok(f"{rel} → {needle}")
        else:
            bad(f"{rel} missing {needle}")

    # Unified apply contract present on packs
    print("[load-check] class-balance apply(classes)")
    for name in (
        "warrior", "paladin", "hunter", "rogue", "priest",
        "deathknight", "shaman", "mage", "warlock", "monk", "druid",
    ):
        text = (ROOT / "class-balance" / f"{name}-abilities.js").read_text(encoding="utf-8")
        if "CLASS_BALANCE_PACKS" in text or "CLASS_BALANCE_API" in text:
            ok(f"{name} registers pack")
        else:
            bad(f"{name} does not register CLASS_BALANCE_PACKS")


def find_browser() -> str | None:
    candidates = [
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    ]
    for c in candidates:
        if c.is_file():
            return str(c)
    return None


def balance_smoke_browser() -> None:
    print("[balance-smoke] browser headless")
    browser = find_browser()
    if not browser:
        bad("no Chrome/Edge found for balance smoke")
        return

    smoke_path = (ROOT / "tests" / "browser-smoke.html").resolve()
    url = smoke_path.as_uri()
    # file:// may block local script loads in some browsers — serve via temp? 
    # Chrome allows file:// sibling scripts for same directory tree usually.
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--virtual-time-budget=8000",
        f"--dump-dom",
        url,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60, encoding="utf-8", errors="replace")
    except Exception as e:
        bad(f"browser run failed: {e}")
        return

    dom = proc.stdout or ""
    # Parse marker
    m = re.search(
        r'id="smoke-result"[^>]*data-status="(OK|FAIL)"[^>]*data-fails="(\d+)"[^>]*data-warns="(\d+)"',
        dom,
    )
    if not m:
        # title fallback
        t = re.search(r"<title>([^<]+)</title>", dom)
        title = t.group(1) if t else ""
        if title.startswith("SMOKE_OK"):
            ok(f"title {title}")
            return
        if title.startswith("SMOKE_FAIL"):
            bad(f"title {title}")
            # print a bit of pre
            pre = re.search(r'<pre id="out">([\s\S]*?)</pre>', dom)
            if pre:
                print(pre.group(1)[:2000])
            return
        bad("could not parse smoke result from DOM")
        print(dom[:1500])
        if proc.stderr:
            print("stderr:", proc.stderr[:800])
        return

    status, nfail, nwarn = m.group(1), int(m.group(2)), int(m.group(3))
    if status == "OK":
        ok(f"balance packs OK (warns={nwarn})")
    else:
        bad(f"balance smoke FAIL fails={nfail} warns={nwarn}")
        pre = re.search(r'<pre id="out">([\s\S]*?)</pre>', dom)
        if pre:
            print(pre.group(1)[:3000])


def main() -> int:
    load_check()
    balance_smoke_browser()
    print()
    if fails:
        print(f"[smoke] FAIL ({len(fails)} issue(s))")
        for f in fails:
            print("  -", f)
        return 1
    print("[smoke] OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
