#!/usr/bin/env python3
"""Verify Package ID chain: registry ↔ iqnb distribution ↔ optional inner ZIP."""
from __future__ import annotations

import argparse
import io
import json
import ssl
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

UA = "Default-Json-D-App/verify-package-ids"


def fetch_json(url: str, timeout: float) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return json.loads(resp.read().decode())


def distribution_app_id(doc: dict) -> str:
    app_id = str(doc.get("appId", "")).strip()
    legacy = str(doc.get("id", "")).strip()
    if app_id and legacy and app_id != legacy:
        raise ValueError(f"distribution id {legacy!r} != appId {app_id!r}")
    return app_id or legacy


def inner_app_id(url_zip: str, timeout: float) -> str:
    req = urllib.request.Request(url_zip, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        data = resp.read()
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for name in ("manifest.json", "meta.wallet/manifest.json"):
            if name in zf.namelist():
                inner = json.loads(zf.read(name).decode())
                return str(inner.get("appId", "")).strip()
        # first manifest.json anywhere
        for name in zf.namelist():
            if name.endswith("manifest.json"):
                inner = json.loads(zf.read(name).decode())
                return str(inner.get("appId", "")).strip()
    raise ValueError("no manifest.json in zip")


def scan_home_grids(repo: Path, catalog: dict[str, str]) -> list[str]:
    errors: list[str] = []
    roots = [repo / "launcher", repo / "main-v1.0.2" / "launcher"]
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("default_app_*.json"):
            if "_catalog" in path.parts:
                continue
            data = json.loads(path.read_text())
            if data.get("schemaVersion") != 2:
                continue
            pkg_by_id = {p["appId"]: p.get("manifest") for p in data.get("packages", [])}
            for key in ("apps", "dock"):
                for app in data.get(key, []):
                    if app.get("kind") != "dapp":
                        continue
                    aid = app.get("appId", "")
                    if aid in ("settings", "files"):
                        continue
                    if app.get("package"):
                        continue
                    pref = app.get("packageRef") or aid
                    if pref != aid:
                        errors.append(f"{path}: {aid} packageRef {pref!r} != appId")
                    if pref not in catalog:
                        continue
                    if pref not in pkg_by_id:
                        errors.append(f"{path}: {aid} package {pref!r} missing from packages[]")
                    elif pkg_by_id.get(pref) != catalog[pref]:
                        errors.append(f"{path}: packages[{pref}] manifest != catalog")
            for widget in data.get("widgets", []):
                pref = widget.get("packageRef", "")
                if pref and pref in catalog and pref not in pkg_by_id:
                    errors.append(f"{path}: widget packageRef {pref!r} not in packages[]")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-zip", action="store_true", help="Also verify inner manifest appId")
    parser.add_argument("--timeout", type=float, default=45.0)
    args = parser.parse_args()

    repo = Path(__file__).resolve().parents[2]
    catalog_path = repo / "launcher" / "_catalog" / "dapp-packages.json"
    catalog_doc = json.loads(catalog_path.read_text())
    catalog = {p["appId"]: p["manifest"] for p in catalog_doc.get("packages", [])}

    failed = False
    for app_id, manifest_url in catalog.items():
        try:
            dist = fetch_json(manifest_url, args.timeout)
            dist_id = distribution_app_id(dist)
            if dist_id != app_id:
                print(f"FAIL {app_id}: distribution has {dist_id!r}")
                failed = True
                continue
            print(f"OK   {app_id} distribution")
            if args.check_zip:
                url_zip = str(dist.get("urlZip", "")).strip()
                if not url_zip:
                    print(f"FAIL {app_id}: no urlZip")
                    failed = True
                    continue
                inner = inner_app_id(url_zip, args.timeout)
                if inner != app_id:
                    print(f"FAIL {app_id}: inner ZIP appId {inner!r}")
                    failed = True
                else:
                    print(f"OK   {app_id} inner ZIP")
        except (urllib.error.URLError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
            print(f"FAIL {app_id}: {exc}")
            failed = True

    grid_errors = scan_home_grids(repo, catalog)
    for err in grid_errors[:20]:
        print(f"FAIL grid: {err}")
    if len(grid_errors) > 20:
        print(f"FAIL grid: … and {len(grid_errors) - 20} more")
    if grid_errors:
        failed = True

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
