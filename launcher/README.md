# HOME launcher JSON (schema 2)

## Version SSOT (iqnb)

App release version **`V_app`** lives only on the iqnb distribution manifest (e.g. [wallet.json](https://json.iqnb.com/wallet.json)).

- Inner ZIP `manifest.json` must equal **`V_app`** at build time.
- HOME root `"version"` is **layout only** (grid/dock/widgets), not app release.

Catalog: [`_catalog/dapp-packages.json`](_catalog/dapp-packages.json) is the **SSOT** for Package ID + manifest URL (`displayName` optional). MeOS identity rules: qt-core [home-defaults-identity.md](https://github.com/QuangFiIt/qt-core/blob/main/docs/apps/home-defaults-identity.md).

## Package ID (iqnb)

Distribution JSON should include **`appId`** alongside legacy **`id`** (same value). See qt-core [iqnb-distribution-manifest.md](https://github.com/QuangFiIt/qt-core/blob/main/docs/apps/iqnb-distribution-manifest.md).

## Release checklist (Wallet example)

1. Bump **`V_app`** on iqnb (`wallet.json`) when the ZIP is ready (or chốt số trước, publish metadata sau).
2. Build Wallet with the same version: `scripts/build-meos-release.sh` (reads `wallet.json`).
3. Zip `dist/`, verify: `unzip -p wallet.zip manifest.json` → `"version"` = **`V_app`**.
4. Upload ZIP; update `hash`, `sign`, `urlZip` on `wallet.json`; add `"appId": "meta.wallet"` next to `"id"`.
5. `python3 launcher/tools/verify-package-ids.py` (add `--check-zip` before release).
6. **Legacy clients:** `python3 launcher/tools/sync-from-iqnb.py --write-version --bump-home` then publish `main-v1.0.2/launcher/…`.
7. **MeOS with runtime pin (Phase 2+):** `python3 launcher/tools/strip-package-versions.py` — HOME carries manifest URL only.
8. `python3 launcher/tools/format-home-package-ref.py` after layout edits (optional redundant `packageRef`).
9. Push GitHub; users may need to clear profile `*-default-apps.json` cache after pin changes.

## Tools

| Script | Purpose |
|--------|---------|
| `tools/sync-from-iqnb.py` | Fetch iqnb manifests; optional `--write-version` or `--strip-version` |
| `tools/sync-package-pins.py` | Deprecated wrapper → `--write-version` |
| `tools/apply-h3-dapp-refs.py` | Ensure `packages[]` + `packageRef` from catalog |
| `tools/verify-package-ids.py` | Registry ↔ iqnb (`--check-zip` includes inner manifest) |
| `tools/format-home-package-ref.py` | Drop `packageRef` when equal to `appId` on apps/dock |
| `tools/publish-to-main-v1.0.2.sh` | Copy `launcher/` → `main-v1.0.2/launcher/` |
