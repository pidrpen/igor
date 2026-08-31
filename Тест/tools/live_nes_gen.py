# NES idle generator for live fight. Reads JWT from ~/.grok/auth.json. Do not print the key.
import json, os, sys, uuid, tempfile, subprocess, base64
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "assets" / "sprites" / "characters"
API = "https://api.x.ai/v1/images/generations"
MODEL = "grok-imagine-image-2.0"

STYLE = (
    "Nintendo NES 8-bit game sprite, chunky blocky pixels, limited 16-color palette "
    "like Super Mario Bros 3 and Final Fantasy 1 NES. Full-body character, bulky NES "
    "proportions, standing idle three-quarter view facing slightly to the viewer's right. "
    "Isolated on a perfectly flat chroma-key green background #00FF00. No drop shadow, "
    "no floor, no scenery, no text. Same scale as a NES RPG party member sprite. "
)

CHARS = {
    "paladin_ret_nes": STYLE + "Unique body: human male paladin in bright gold-and-white plate armor, short brown hair, clean-shaven, two-handed golden greatsword held down on his right (viewer right), gold sun tabard, short red cape, square gold boots. Not a panda, not a skeleton, not a woman, not a grandma.",
    "hunter_bm_nes": STYLE + "Unique body: night elf huntress, tall lean female, long dark teal hair, purple-tan skin, green-and-brown mail, longbow in her left hand (viewer right), quiver on her back, leather boots. Not a panda, not a skeleton, not a grandma.",
    "warrior_nes": STYLE + "Unique body: orc warrior male, green skin, brown plate and leather, huge two-handed battleaxe resting on his right shoulder (viewer right), tusks, dark topknot. Not a panda, not gold paladin, not a skeleton.",
    "rogue_nes": STYLE + "Unique body: goblin rogue male, short, yellow-green skin, dark leather, two daggers, huge ears, sly grin, red bandana. Not a panda, not a paladin.",
    "priest_nes": STYLE + "Unique body: dwarf priest woman, stout, white-and-gold robes, blonde braid, wooden staff with a gold sun on top held in her right hand (viewer right). Not a panda, not a grandma shaman.",
    "mage_nes": STYLE + "Unique body: gnome mage male, tiny, long blue pointed hat, blue robes with silver runes, frost staff taller than him in his right hand (viewer right). Not a panda.",
    "warlock_nes": STYLE + "Unique body: human warlock male, pale, purple-black robes, fel-green glowing eyes, skull-topped staff in his right hand (viewer right). Not a skeleton knight, not a panda.",
    "druid_nes": STYLE + "Unique body: tauren druid male, brown fur, huge horns, leather and leaves, wooden staff with a crescent moon in his right hand (viewer right). Not a brewmaster panda bear.",
    "dh_nes": STYLE + "Unique body: night elf demon hunter male, blindfold, green fel tattoos, two warglaives, short black hair, sleeveless leather. Not a paladin, not a panda.",
    "engineer_nes": STYLE + "Unique body: gnome engineer male, goggles on forehead, bronze-and-copper gear armor, huge wrench in his right hand (viewer right), toolbelt. Not a paladin, not a panda.",
}


def auth_key():
    p = Path.home() / ".grok" / "auth.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    first = next(iter(data.values()))
    if isinstance(first, dict) and first.get("key"):
        return first["key"]
    raise SystemExit("no key")


def chroma(src: Path, dest: Path):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g >= 140 and r < 90 and b < 90:
                px[x, y] = (0, 0, 0, 0)
            elif r < 16 and g < 16 and b < 16:
                px[x, y] = (0, 0, 0, 0)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)


EDIT_API = "https://api.x.ai/v1/images/edits"

POSES = {
    "idle_front": "Keep the same unique character, same clothes, same colors, same NES 8-bit pixel style. Turn the body to face the camera (front view). Isolated on flat chroma-key green #00FF00, no shadow, no floor.",
    "idle_back": "Keep the same unique character, same clothes, same colors, same NES 8-bit pixel style. Show the back view, no face, weapon still visible. Isolated on flat chroma-key green #00FF00, no shadow, no floor.",
    "walk": "Keep the same unique character, same clothes, same colors, same NES 8-bit pixel style. Mid-stride walking pose, one foot forward, three-quarter view facing slightly right. Isolated on flat chroma-key green #00FF00, no shadow, no floor.",
    "attack": "Keep the same unique character, same clothes, same colors, same NES 8-bit pixel style. Attack pose: weapon raised striking to the right. Isolated on flat chroma-key green #00FF00, no shadow, no floor.",
}


def call_api(url: str, payload: dict) -> bytes:
    key = auth_key()
    tmp = Path(tempfile.gettempdir()) / ("nes_" + uuid.uuid4().hex + ".json")
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    outj = Path(tempfile.gettempdir()) / ("nes_out_" + uuid.uuid4().hex + ".json")
    cmd = [
        "curl", "-sS", "--max-time", "180", "-X", "POST", url,
        "-H", "Content-Type: application/json",
        "-H", "Authorization: Bearer " + key,
        "--data-binary", "@" + str(tmp),
        "-o", str(outj),
    ]
    print("api", url.split("/")[-1], "bytes", tmp.stat().st_size, flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    tmp.unlink(missing_ok=True)
    if r.returncode != 0:
        raise RuntimeError("curl " + (r.stderr or r.stdout or ""))
    raw = outj.read_text(encoding="utf-8", errors="replace")
    try:
        data = json.loads(raw)
    except Exception as e:
        raise RuntimeError("json " + raw[:400]) from e
    b64 = None
    if isinstance(data, dict):
        arr = data.get("data") or []
        if arr and isinstance(arr[0], dict):
            b64 = arr[0].get("b64_json") or arr[0].get("b64")
        if not b64 and data.get("error"):
            raise RuntimeError("api " + json.dumps(data.get("error"))[:400])
    if not b64:
        raise RuntimeError("no image " + raw[:400])
    outj.unlink(missing_ok=True)
    return base64.b64decode(b64)


def generate_one(name: str, prompt: str) -> Path:
    key = auth_key()
    tmp = Path(tempfile.gettempdir()) / ("nes_" + uuid.uuid4().hex + ".json")
    tmp.write_text(json.dumps({"model": MODEL, "prompt": prompt, "n": 1}), encoding="utf-8")
    outj = Path(tempfile.gettempdir()) / ("nes_out_" + uuid.uuid4().hex + ".json")
    cmd = [
        "curl", "-sS", "--max-time", "120", "-X", "POST", API,
        "-H", "Content-Type: application/json",
        "-H", "Authorization: Bearer " + key,
        "--data-binary", "@" + str(tmp),
        "-o", str(outj),
    ]
    print("api url-mode", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    tmp.unlink(missing_ok=True)
    if r.returncode != 0:
        raise RuntimeError("curl " + (r.stderr or r.stdout or ""))
    rawtxt = outj.read_text(encoding="utf-8", errors="replace")
    data = json.loads(rawtxt)
    url = None
    b64 = None
    if isinstance(data, dict):
        arr = data.get("data") or []
        if arr and isinstance(arr[0], dict):
            url = arr[0].get("url")
            b64 = arr[0].get("b64_json")
        if not url and not b64 and data.get("error"):
            raise RuntimeError("api " + json.dumps(data.get("error"))[:400])
    folder = CHAR / name
    folder.mkdir(parents=True, exist_ok=True)
    jpg = folder / "idle_raw.jpg"
    if url:
        print("dl", url[:60], flush=True)
        imgj = Path(tempfile.gettempdir()) / ("nes_img_" + uuid.uuid4().hex)
        d = subprocess.run(["curl", "-sS", "--max-time", "60", "-L", url, "-o", str(imgj)], capture_output=True, text=True)
        if d.returncode != 0:
            raise RuntimeError("dl " + (d.stderr or ""))
        jpg.write_bytes(imgj.read_bytes())
        imgj.unlink(missing_ok=True)
    elif b64:
        jpg.write_bytes(base64.b64decode(b64))
    else:
        raise RuntimeError("no image " + rawtxt[:400])
    outj.unlink(missing_ok=True)
    png = folder / "idle_00.png"
    chroma(jpg, png)
    return png


def edit_one(folder_name: str, pose: str) -> Path:
    folder = CHAR / folder_name
    src = folder / "idle_00.png"
    if not src.exists():
        raise RuntimeError("no idle " + folder_name)
    prompt = POSES[pose]
    b64 = base64.b64encode(src.read_bytes()).decode("ascii")
    raw = call_api(EDIT_API, {
        "model": MODEL,
        "prompt": prompt,
        "image": "data:image/png;base64," + b64,
        "response_format": "b64_json",
    })
    tmp = folder / (pose + "_raw.jpg")
    tmp.write_bytes(raw)
    if pose == "idle_front":
        dest = folder / "idle_front_00.png"
    elif pose == "idle_back":
        dest = folder / "idle_back_00.png"
    elif pose == "walk":
        dest = folder / "walk_00.png"
    elif pose == "attack":
        dest = folder / "attack_00.png"
    else:
        dest = folder / (pose + ".png")
    chroma(tmp, dest)
    if pose == "walk":
        for i in range(1, 4):
            (folder / ("walk_" + str(i).zfill(2) + ".png")).write_bytes(dest.read_bytes())
    if pose == "attack":
        for i in range(1, 6):
            (folder / ("attack_" + str(i).zfill(2) + ".png")).write_bytes(dest.read_bytes())
    return dest


def main():
    args = sys.argv[1:]
    ok, bad = [], []
    if args and args[0] == "--edit":
        folder = args[1]
        poses = args[2:] or list(POSES.keys())
        for pose in poses:
            try:
                p = edit_one(folder, pose)
                print("OK", folder, pose, p, flush=True)
                ok.append(pose)
            except Exception as e:
                print("FAIL", folder, pose, str(e)[:500])
                bad.append(pose)
        print("done ok", len(ok), "fail", len(bad))
        if bad:
            sys.exit(2)
        return
    names = args or list(CHARS.keys())
    for name in names:
        prompt = CHARS.get(name)
        if not prompt:
            print("skip unknown", name)
            continue
        try:
            print("start", name, flush=True)
            p = generate_one(name, prompt)
            print("OK", name, p, p.stat().st_size, flush=True)
            ok.append(name)
        except Exception as e:
            print("FAIL", name, str(e)[:500])
            bad.append(name)
    print("done ok", len(ok), "fail", len(bad))
    if bad:
        sys.exit(2)


if __name__ == "__main__":
    main()
