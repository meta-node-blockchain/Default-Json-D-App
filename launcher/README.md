# HOME launcher JSON (schema 2)

## Version SSOT (iqnb)

App release version **`V_app`** lives only on the iqnb distribution manifest (e.g. [wallet.json](https://json.iqnb.com/wallet.json)).

- Inner ZIP `manifest.json` must equal **`V_app`** at build time.
- HOME root `"version"` is **layout only** (grid/dock/widgets), not app release.

Catalog: [`_catalog/dapp-packages.json`](_catalog/dapp-packages.json) lists `appId` + `manifest` URL only (no pinned version).

## Release checklist (Wallet example)

1. Bump **`V_app`** on iqnb (`wallet.json`) when the ZIP is ready (or chốt số trước, publish metadata sau).
2. Build Wallet with the same version: `scripts/build-meos-release.sh` (reads `wallet.json`).
3. Zip `dist/`, verify: `unzip -p wallet.zip manifest.json` → `"version"` = **`V_app`**.
4. Upload ZIP; update `hash`, `sign`, `urlZip` on `wallet.json`.
5. **Legacy clients:** `python3 launcher/tools/sync-from-iqnb.py --write-version --bump-home` then publish `main-v1.0.2/launcher/…`.
6. **MeOS with runtime pin (Phase 2+):** `python3 launcher/tools/strip-package-versions.py` — HOME carries manifest URL only.
7. Push GitHub; users may need to clear profile `*-default-apps.json` cache after pin changes.

## Tools

| Script | Purpose |
|--------|---------|
| `tools/sync-from-iqnb.py` | Fetch iqnb manifests; optional `--write-version` or `--strip-version` |
| `tools/sync-package-pins.py` | Deprecated wrapper → `--write-version` |
| `tools/apply-h3-dapp-refs.py` | Ensure `packages[]` + `packageRef` from catalog |
| `tools/publish-to-main-v1.0.2.sh` | Copy `launcher/` → `main-v1.0.2/launcher/` |
