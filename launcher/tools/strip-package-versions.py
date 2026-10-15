#!/usr/bin/env python3
"""Remove packages[].version from all schema-2 HOME grid files (Phase 3)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    script = Path(__file__).resolve().parent / "sync-from-iqnb.py"
    return subprocess.call(
        [sys.executable, str(script), "--strip-version", "--bump-home"],
        cwd=script.parents[2],
    )


if __name__ == "__main__":
    raise SystemExit(main())
