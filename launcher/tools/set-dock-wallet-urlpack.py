#!/usr/bin/env python3
"""Set dock Wallet urlPack on every HOME layout under launcher/main."""
from __future__ import annotations

import json
import re
from pathlib import Path

WALLET_APP_ID = "meta.wallet"
URL_PACK = "https://json.iqnb.com/wallet.json"
RELEASE = re.compile(r"^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$")


def bump_patch(version: str) -> str:
    m = RELEASE.match(version.strip())
    if not m:
        return "34.0.1"
    a, b, c = (int(m.group(i)) for i in range(1, 4))
    return f"{a}.{b}.{c + 1}"


def set_url_pack(app: dict) -> bool:
    if app.get("urlPack") == URL_PACK:
        return False
    rebuilt: dict = {}
    inserted = False
    for key, value in app.items():
        if key == "urlPack":
            continue
        rebuilt[key] = value
        if key == "icon" and not inserted:
            rebuilt["urlPack"] = URL_PACK
            inserted = True
    if not inserted:
        rebuilt["urlPack"] = URL_PACK
    app.clear()
    app.update(rebuilt)
    return True


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    root = repo / "launcher" / "main"
    if not root.is_dir():
        print(f"missing {root}")
        return 1

    updated = 0
    unchanged = 0
    missing = 0
    for path in sorted(root.rglob("default_app_*.json")):
        data = json.loads(path.read_text())
        changed = False
        found = False
        for app in data.get("dock", []):
            if app.get("appId") != WALLET_APP_ID:
                continue
            found = True
            if set_url_pack(app):
                changed = True
        rel = path.relative_to(repo)
        if not found:
            missing += 1
            print(f"no dock wallet: {rel}")
            continue
        if not changed:
            unchanged += 1
            continue
        data["version"] = bump_patch(str(data.get("version", "34.0.0")))
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        updated += 1

    print(
        f"set dock wallet urlPack in {updated} file(s); "
        f"unchanged {unchanged}; missing {missing}"
    )
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
