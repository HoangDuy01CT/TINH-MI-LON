# TINH MÍ LON V139 — Unified Menu & Functional Boosters

## Mục tiêu
Đồng bộ màn hình chọn game/menu và Booster với design system sapphire/gold của gameplay, đồng thời sửa thao tác Booster.

## Thay đổi chính
- Menu khởi động dùng một layout 1 hệ thống: header, trạng thái Save, nút chính, lưới lựa chọn 2 cột và Close.
- Các nút menu dùng chung `modalAction` với giao diện gameplay.
- Menu không còn bị đè bởi header BEJEWELED của gameplay.
- Booster screen dùng cùng modal frame, spacing, card và action button với menu.
- Sửa lỗi Booster không thể dùng: Booster screen trước đây đặt `state='boosters'` nhưng `boosterCanUse()` chỉ cho phép `state==='playing'`. V139 cho phép lựa chọn Booster khi state là `playing` hoặc `boosters`.
- Hitbox của Booster dùng đúng cùng layout với phần render.
- `game.js`, `sw.js`, manifest dùng cache/version 139.

## Bảo toàn
Giữ nguyên gameplay Match-3, Special/Fusion, Save, Undo, Mission, Daily/Streak, AI Hint, Difficulty Scaling, Haptic, Sound, Local Game Feel và bộ gem tùy chỉnh.
