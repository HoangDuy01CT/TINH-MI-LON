# TINH MI LON V150 — Special Gem Engine Core

Nền: V149 Settings + Special Gem.

## V150
- Giữ nguyên `app.js`, `game.js`, `sw.js` riêng biệt.
- Xây dựng lõi 7 Special Gem:
  1. `row` — Line-H: match 4 ngang, phá hàng.
  2. `col` — Line-V: match 4 dọc, phá cột.
  3. `bomb` — giao nhau dạng L: nổ 3×3.
  4. `cross` — giao nhau dạng T/plus: phá hàng + cột.
  5. `lightning` — match 6: phá 3 hàng + 3 cột quanh vị trí.
  6. `rainbow` — match 5: Color Bomb, chọn màu.
  7. `star` — match 7: Rainbow Star, chọn màu bằng cơ chế 2 chạm.
- Ưu tiên tạo Special theo cấp: row/col < bomb < cross < lightning < rainbow < star.
- Star và Rainbow đều hỗ trợ chọn màu thủ công; chạm lại để hủy.
- Điểm tạo Special có trọng số theo cấp độ; vẫn dùng Combo/Cascade/Objective/Mission hiện tại.
- Special activation đi qua Game Feel/Haptic/Sound engine hiện có, không thêm audio asset bắt buộc.
- Hiệu ứng mới của Cross/Lightning/Star được vẽ bằng Canvas nhẹ, tránh particle toàn màn hình.

## Không thay đổi
- Không gộp `app.js` và `game.js`.
- Không thay đổi Tutorial V148.
- Không thay đổi Save/Undo/Booster/Settings ngoài việc cập nhật version cache.
- Fusion nâng cao tiếp tục ở bước kế tiếp.

## Kiểm tra
- `node --check game.js`: PASS
- `node --check sw.js`: PASS
- `manifest.webmanifest` JSON: PASS
- ZIP integrity: PASS
