# HOME schema 2 — staging (Cách A)

MeOS tải JSON tại:

```text
https://raw.githubusercontent.com/meta-node-blockchain/Default-Json-D-App/main-v1.0.2/launcher/{main|test|cyber}/{windows|linux}/default_app_{gridKey}.json

MeOS: base mặc định đã gồm ref `main-v1.0.2/`; path = `launcher/…`.
```

- **macOS và Windows** đọc thư mục `windows/` (không dùng `macos/` khi publish).
- **Linux / FreeBSD** đọc `linux/`; nếu 404 thì fallback `windows/`.

## Cách A — luồng làm việc

1. **Chỉnh / tạo** file schema 2 dưới `launcher/{env}/{windows|macos|linux}/`.
2. **Kiểm tra** (parser MeOS, app thật):
   - `python3 launcher/tools/convert-legacy-to-schema2.py --validate …` hoặc test qt-core `tst_defaultappsconfig`.
   - Thử local:  
     `MEOS_DEFAULT_APPS_URL=file:///…/Default-Json-D-App/`  
     (file nằm tại `main-v1.0.2/launcher/…` sau publish, hoặc chỉnh trực tiếp `launcher/…` trên branch).
3. **Publish** sang production path (URL giữ nguyên):

   ```bash
   ./launcher/tools/publish-to-main-v1.0.2.sh
   ```

   Script copy `launcher/{env}/windows` → `main-v1.0.2/launcher/{env}/windows` và  
   `launcher/{env}/linux` → `main-v1.0.2/launcher/{env}/linux` (nếu thiếu linux thì copy từ windows).

4. **Bump** trường `"version"` trong mọi file vừa đổi (MeOS bỏ qua bản ≤ cache).

Thư mục `launcher/*/macos/` chỉ để so sánh / client khác — **không** copy vào `main-v1.0.2`.

## Schema

Xem [home-defaults.md](https://github.com/meta-node-blockchain/qt-core/blob/main/docs/apps/home-defaults.md) trong qt-core (`schemaVersion: 2`, `packages`, `apps`, `dock`, `widgets`).

Mẫu: `_templates/home-schema2.template.json`.

## Gói widget bổ sung

Thêm mục vào `_catalog/extra-packages.json` và chạy lại convert (hoặc sửa tay `packages` / `widgets` trên staging).
