#!/usr/bin/env python3
"""Deprecated: use sync-from-iqnb.py --write-version --bump-home."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    script = Path(__file__).resolve().parent / "sync-from-iqnb.py"
    return subprocess.call(
        [sys.executable, str(script), "--write-version", "--bump-home"],
        cwd=script.parents[2],
    )


if __name__ == "__main__":
    raise SystemExit(main())
