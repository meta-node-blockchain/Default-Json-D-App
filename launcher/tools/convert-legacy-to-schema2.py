#!/usr/bin/env python3
"""Convert legacy HOME JSON (favorites/apps) to schema 2 for launcher staging."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

RELEASE = re.compile(r"^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$")
SKIP_IDS = {"trash.metanode.main", "datetimesettings.metanode.main"}
EXTRA_KEYS = ("isFullScreen", "statusBar", "orientation", "version")
BUILTIN_DAPP = {"settings", "files"}


def own_app_id(configured: str) -> str:
    if configured == "setting":
        return "settings"
    if configured in ("finder.m.pro", "files.metanode.main"):
        return "files"
    return configured


def bump_home_version(legacy_version: str, bump: str | None) -> str:
    if bump:
        return bump
    m = RELEASE.match(legacy_version.strip())
    if not m:
        return "34.0.0"
    a, b, c = (int(m.group(i)) for i in range(1, 4))
    return f"{a}.{b}.{c + 1}"


def release_version(version: str) -> bool:
    m = RELEASE.match(version.strip())
    if not m:
        return False
    a, b, c = (int(m.group(i)) for i in range(1, 4))
    return a > 0 or b > 0 or c > 0


def kind_of(entry: dict) -> str | None:
    t = entry.get("type")
    if t == 4:
        return "web"
    if t == 1:
        return "dapp"
    return None


def convert_entry(entry: dict) -> tuple[dict | None, dict | None]:
    raw_id = entry.get("id") or entry.get("bundleId") or ""
    if not raw_id or raw_id in SKIP_IDS:
        return None, None
    kind = kind_of(entry)
    if not kind:
        return None, None

    app_id = own_app_id(raw_id)
    pos = entry.get("position") or {}
    col = int(pos.get("x", 0))
    row = int(pos.get("y", 0))
    w = int(pos.get("width", 1))
    h = int(pos.get("height", 1))

    out: dict = {
        "appId": app_id,
        "name": entry.get("name", app_id),
        "kind": kind,
        "page": int(entry.get("page", 0)),
        "column": col,
        "row": row,
    }
    icon = entry.get("logo") or entry.get("icon")
    if icon:
        out["icon"] = icon
    if kind == "web":
        if entry.get("url"):
            out["url"] = entry["url"]
        script = entry.get("urlScript") or entry.get("script")
        if script:
            out["script"] = script
    for key in EXTRA_KEYS:
        if key in entry:
            out[key] = entry[key]

    pkg: dict | None = None
    if kind == "dapp" and app_id not in BUILTIN_DAPP:
        manifest = entry.get("urlPack") or entry.get("package")
        if not manifest or not str(manifest).startswith("https://"):
            return None, None
        ver = str(entry.get("version") or "1.0.0")
        if not release_version(ver):
            ver = "1.0.0"
        out["packageRef"] = app_id
        pkg = {"appId": app_id, "version": ver, "manifest": manifest}

    if w > 1 or h > 1:
        out["columnSpan"] = w
        out["rowSpan"] = h

    return out, pkg


def merge_packages(existing: dict[str, dict], pkg: dict) -> None:
    aid = pkg["appId"]
    if aid not in existing:
        existing[aid] = pkg
        return
    # Keep first manifest; warn if version differs
    if existing[aid]["version"] != pkg["version"]:
        pass


def convert_file(
    legacy: dict,
    home_version_bump: str | None,
    extra_catalog: dict,
) -> dict:
    packages: dict[str, dict] = {}
    apps: list[dict] = []
    dock: list[dict] = []
    seen_app: set[str] = set()

    for key, target in (("apps", apps), ("favorites", dock)):
        for entry in legacy.get(key, []):
            if not isinstance(entry, dict):
                continue
            app, pkg = convert_entry(entry)
            if not app:
                continue
            if app["appId"] in seen_app:
                continue
            seen_app.add(app["appId"])
            target.append(app)
            if pkg:
                merge_packages(packages, pkg)

    for pkg in extra_catalog.get("packages", []):
        if isinstance(pkg, dict) and pkg.get("appId"):
            merge_packages(packages, pkg)

    widgets = list(extra_catalog.get("widgets") or [])
    version = bump_home_version(str(legacy.get("version", "0.0.0")), home_version_bump)

    return {
        "schemaVersion": 2,
        "version": version,
        "packages": sorted(packages.values(), key=lambda p: p["appId"]),
        "apps": apps,
        "dock": dock,
        "widgets": widgets,
    }


def main() -> int:
    repo = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--env",
        action="append",
        default=["main", "test", "cyber"],
        help="buildEnv folders under repo root (default: main test cyber)",
    )
    parser.add_argument(
        "--platform",
        action="append",
        default=["windows"],
        help="legacy platform folder (default: windows)",
    )
    parser.add_argument(
        "--home-version",
        help='override schema 2 "version" for all outputs (e.g. 34.0.0)',
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print paths only, do not write",
    )
    args = parser.parse_args()

    catalog_path = repo / "launcher" / "_catalog" / "extra-packages.json"
    extra = json.loads(catalog_path.read_text()) if catalog_path.is_file() else {}

    written = 0
    for env in args.env:
        for platform in args.platform:
            src_dir = repo / env / platform
            if not src_dir.is_dir():
                print(f"skip missing {src_dir}", file=sys.stderr)
                continue
            dst_dir = repo / "launcher" / env / platform
            for src in sorted(src_dir.glob("default_app_*.json")):
                legacy = json.loads(src.read_text())
                if legacy.get("schemaVersion") == 2:
                    continue
                out = convert_file(legacy, args.home_version, extra)
                dst = dst_dir / src.name
                if args.dry_run:
                    print(f"{src} -> {dst}")
                    continue
                dst_dir.mkdir(parents=True, exist_ok=True)
                dst.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
                written += 1

    print(f"converted {written} file(s) under launcher/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
