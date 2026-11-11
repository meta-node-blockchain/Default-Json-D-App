#!/usr/bin/env python3
"""Bố cục widget dạng gói của HOME quán net trên lưới 12 cột (bug 8, ảnh mẫu).

Khối widget 12 cột x 4 hàng ở đáy trang (R = số hàng - 4), khớp với
qt-core qml/netcafe/NetCafeLayout.qml (wideCells):

  R   : Play Time 3x1 | Wallet 2x1 | Recent Apps 4x1 | Support Chat 3x1
  R+1 : Food & Drink 3x3 | Special Deals 6x3 | Audio 3x1
  R+2 :                  |                  | Capture 3x1
  R+3 :                  |                  | Dark Mode 3x1

Script này chỉ đặt 4 widget dạng gói (Play Time, Wallet, Support Chat, Food & Drink).
Các widget còn lại là widget của shell, do qt-core tự đặt.
Chỉ sửa file 12 cột có ít nhất 5 hàng (còn chỗ cho 1 hàng icon ở trên); file khác giữ nguyên.

    python3 launcher/tools/netcafe-wide-widgets.py            # sửa file
    python3 launcher/tools/netcafe-wide-widgets.py --check    # chỉ báo file nào lệch
"""
import json
import re
import sys
from pathlib import Path

FOLDER = Path(__file__).resolve().parent.parent / "netcafe" / "windows"
BLOCK_ROWS = 4
# widgetType -> (column, row in the block, columnSpan, rowSpan)
CELLS = {
    "vn.meos.widget.sessionuptime": (0, 0, 3, 1),
    "vn.meos.widget.cyberbalance": (3, 0, 2, 1),
    "vn.meos.widget.chat": (9, 0, 3, 1),
    "vn.meos.widget.foodorder": (0, 1, 3, 3),
}
NAME = re.compile(r"^default_app_12x(\d+)f12\.json$")


def bump(version: str) -> str:
    parts = version.split(".")
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        parts[2] = str(int(parts[2]) + 1)
        return ".".join(parts)
    return version


def placed(data: dict, rows: int) -> dict:
    first = rows - BLOCK_ROWS
    out = json.loads(json.dumps(data))
    for widget in out.get("widgets", []):
        cell = CELLS.get(widget.get("widgetType"))
        if cell is None:
            continue
        column, row, column_span, row_span = cell
        widget["page"] = 0
        widget["column"] = column
        widget["row"] = first + row
        widget["columnSpan"] = column_span
        widget["rowSpan"] = row_span
    return out


def main() -> int:
    check = "--check" in sys.argv
    off = 0
    for path in sorted(FOLDER.glob("default_app_12x*f12.json")):
        match = NAME.match(path.name)
        rows = int(match.group(1)) if match else 0
        if rows < BLOCK_ROWS + 1:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        wanted = placed(data, rows)
        if wanted.get("widgets") == data.get("widgets"):
            continue
        off += 1
        if check:
            print(f"lệch: {path.name}")
            continue
        wanted["version"] = bump(str(data.get("version", "")))
        path.write_text(json.dumps(wanted, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"đã sửa: {path.name} (version {wanted['version']})")
    if check and off:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
