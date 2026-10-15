#!/usr/bin/env bash
# Cách A: copy validated schema-2 staging → main-v1.0.2 (MeOS production URL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENVS=(main test cyber)
PLATFORMS=(windows linux)

for env in "${ENVS[@]}"; do
  for plat in "${PLATFORMS[@]}"; do
    src="${ROOT}/launcher/${env}/${plat}"
    dst="${ROOT}/main-v1.0.2/launcher/${env}/${plat}"
    if [[ ! -d "$src" ]] || [[ -z "$(ls -A "$src" 2>/dev/null || true)" ]]; then
      if [[ "$plat" == "linux" ]]; then
        src="${ROOT}/launcher/${env}/windows"
      fi
    fi
    if [[ ! -d "$src" ]] || [[ -z "$(ls -A "$src" 2>/dev/null || true)" ]]; then
      echo "skip empty ${env}/${plat} (no launcher source)"
      continue
    fi
    mkdir -p "$dst"
    rsync -a --delete "${src}/" "${dst}/"
    echo "published ${env}/${plat} -> main-v1.0.2/launcher/${env}/${plat}"
  done
done

echo "Done. Push main-v1.0.2/ to GitHub; clients keep default MEOS_DEFAULT_APPS_URL."
