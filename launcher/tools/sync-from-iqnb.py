#!/usr/bin/env python3
"""Sync HOME packages[] from iqnb distribution manifests (SSOT).

Reads launcher/_catalog/dapp-packages.json (appId + manifest URL only).
For each manifest URL, GET json.version and optionally update grid JSON files.

  --write-version   Set packages[].version on every default_app_*.json (Phase 1 / legacy clients).
  --strip-version   Remove packages[].version (Phase 3 / MeOS with runtime pin).
  --bump-home       When grid files change, bump root \"version\" patch (default with --write-version).

Without flags, prints fetched V_app per appId (dry run).
"""
from __future__ import annotations

import argparse
import json
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

RELEASE = re.compile(r"^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$")


def bump_patch(version: str) -> str:
    m = RELEASE.match(version.strip())
    if not m:
        return "34.0.2"
    a, b, c = (int(m.group(i)) for i in range(1, 4))
    return f"{a}.{b}.{c + 1}"


def fetch_version(url: str, timeout: float = 30.0) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Default-Json-D-App/sync-from-iqnb"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        data = json.loads(resp.read().decode())
    version = str(data.get("version", "")).strip()
    if not RELEASE.match(version):
        raise ValueError(f"{url}: invalid version {version!r}")
    return version


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-version", action="store_true", help="Pin packages[].version from iqnb")
    parser.add_argument("--strip-version", action="store_true", help="Remove packages[].version from grids")
    parser.add_argument("--bump-home", action="store_true", help="Bump HOME root version when grids change")
    args = parser.parse_args()
    if args.write_version and args.strip_version:
        print("choose at most one of --write-version and --strip-version")
        return 2

    repo = Path(__file__).resolve().parents[2]
    catalog = json.loads((repo / "launcher" / "_catalog" / "dapp-packages.json").read_text())
    versions: dict[str, str] = {}
    for entry in catalog.get("packages", []):
        app_id = entry["appId"]
        manifest = entry["manifest"]
        try:
            versions[app_id] = fetch_version(manifest)
        except (urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
            print(f"FAIL {app_id}: {exc}")
            return 1
        print(f"{app_id}\t{versions[app_id]}\t{manifest}")

    if not args.write_version and not args.strip_version:
        return 0

    bump = args.bump_home or args.write_version
    roots = [repo / "launcher", repo / "main-v1.0.2" / "launcher"]
    updated = 0
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("default_app_*.json"):
            if "_catalog" in path.parts:
                continue
            data = json.loads(path.read_text())
            if data.get("schemaVersion") != 2:
                continue
            changed = False
            for pkg in data.get("packages", []):
                aid = pkg.get("appId")
                if args.strip_version and "version" in pkg:
                    del pkg["version"]
                    changed = True
                elif args.write_version and aid in versions:
                    if pkg.get("version") != versions[aid]:
                        pkg["version"] = versions[aid]
                        changed = True
            if changed and bump:
                data["version"] = bump_patch(str(data.get("version", "34.0.0")))
            if changed:
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
                updated += 1
    print(f"updated {updated} grid file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
