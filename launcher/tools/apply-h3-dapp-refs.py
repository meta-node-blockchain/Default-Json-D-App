#!/usr/bin/env python3
"""Ensure schema-2 HOME uses packages[] + packageRef (home-defaults.md), not legacy package."""

from __future__ import annotations

import json
import re
from pathlib import Path

RELEASE = re.compile(r"^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$")
MANIFEST_BY_ID = {
    "meta.wallet": "https://json.iqnb.com/wallet.json",
    "meta.message": "https://json.iqnb.com/message.json",
    "meta.me-office": "https://json.iqnb.com/me-office.json",
}


def bump_patch(version: str) -> str:
    m = RELEASE.match(version.strip())
    if not m:
        return "34.0.4"
    a, b, c = (int(m.group(i)) for i in range(1, 4))
    return f"{a}.{b}.{c + 1}"


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    catalog_path = repo / "launcher" / "_catalog" / "dapp-packages.json"
    catalog = json.loads(catalog_path.read_text())
    by_id = {p["appId"]: dict(p) for p in catalog["packages"]}
    pins_path = repo / "launcher" / "_catalog" / "package-pins.json"
    if pins_path.is_file():
        pins = json.loads(pins_path.read_text())
        for app_id, pkg in by_id.items():
            if app_id in pins:
                pkg["version"] = pins[app_id]

    roots = [repo / "launcher", repo / "main-v1.0.2" / "launcher"]
    updated = 0
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("default_app_*.json"):
            data = json.loads(path.read_text())
            if data.get("schemaVersion") != 2:
                continue
            needed: set[str] = set()
            changed = False
            for key in ("apps", "dock"):
                for app in data.get(key, []):
                    if app.get("kind") != "dapp":
                        continue
                    app_id = app.get("appId", "")
                    if app_id in ("settings", "files"):
                        continue
                    legacy_url = app.pop("package", None)
                    if legacy_url and app_id in MANIFEST_BY_ID:
                        changed = True
                    if app.get("packageRef") != app_id and app_id in by_id:
                        app["packageRef"] = app_id
                        changed = True
                    if app_id in by_id:
                        needed.add(app_id)
            new_packages = sorted((by_id[i] for i in needed), key=lambda p: p["appId"])
            if data.get("packages") != new_packages:
                data["packages"] = new_packages
                changed = True
            if changed:
                data["version"] = bump_patch(str(data.get("version", "34.0.3")))
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
                updated += 1
    print(f"applied packages+packageRef in {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
