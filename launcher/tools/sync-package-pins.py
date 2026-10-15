#!/usr/bin/env python3
"""Apply launcher/_catalog/package-pins.json to all schema-2 HOME files."""
from __future__ import annotations
import json
import re
from pathlib import Path

RELEASE = re.compile(r"^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$")

def bump_patch(version: str) -> str:
    m = RELEASE.match(version.strip())
    if not m:
        return "34.0.2"
    a, b, c = (int(m.group(i)) for i in range(1, 4))
    return f"{a}.{b}.{c + 1}"

def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    pins = json.loads((repo / "launcher" / "_catalog" / "package-pins.json").read_text())
    roots = [repo / "launcher", repo / "main-v1.0.2" / "launcher"]
    updated = 0
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("default_app_*.json"):
            data = json.loads(path.read_text())
            if data.get("schemaVersion") != 2:
                continue
            changed = False
            for pkg in data.get("packages", []):
                aid = pkg.get("appId")
                if aid in pins and pkg.get("version") != pins[aid]:
                    pkg["version"] = pins[aid]
                    changed = True
            if changed:
                data["version"] = bump_patch(str(data.get("version", "34.0.0")))
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
                updated += 1
    print(f"synced pins in {updated} file(s)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
