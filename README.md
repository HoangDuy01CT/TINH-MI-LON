# Tính Mí Lon – Fix danh sách loại lon theo chiều dọc

## Đã sửa đúng nguyên nhân
Lần chỉnh trước dùng các class không tồn tại trong source hiện tại.

Source thực tế dùng:
- `.menu` — khung chứa các loại lon
- `.main-btn` — ô loại lon chính
- `.submenu` — nhóm lựa chọn phụ
- `.sub-btn` — ô lựa chọn phụ

Bản này ép toàn bộ các phần trên hiển thị 1 cột từ trên xuống dưới.

## Kết quả
Lon số 2
↓
Lon số 3
↓
Số 3 Dẹp
↓
Số 3 Vừa
↓
Số 3 Cao
↓
Lon số 5
↓
Lon A10

Service Worker cache: v16.
