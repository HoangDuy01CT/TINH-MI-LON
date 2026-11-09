# TINH MI LON — V152 Combo + Cascade + Score

## Mục tiêu
V152 chuẩn hóa hệ thống điểm và Combo/Cascade sau V150 Special Gem Core + V151 Fusion Engine.

## Nội dung
- Unified score engine cho Match, Combo, Cascade, Special và Fusion.
- Combo multiplier: x1.0 / x1.5 / x2.0 / x2.5 / x3.0, tối đa x5.
- Combo tier: MATCH, COMBO, GREAT COMBO, SUPER COMBO, MEGA COMBO.
- Thưởng riêng theo bậc combo: x2 +100, x3 +250, x4 +450, x5 +700.
- Cascade bonus tăng theo số viên bị phá và chain step.
- Special creation/activation và Fusion được cộng điểm qua cùng một score breakdown.
- Hiển thị score toast và combo tier khi có combo/special.
- Giữ nguyên Objective, Mission, Save, Undo, Booster, Daily và các hệ thống V151.
- Giữ nguyên app.js và game.js riêng biệt.
- Sửa hai toast score dùng biến `cell` không tồn tại, tránh lỗi runtime khi match/rainbow.

## Kiểm tra
- `node --check game.js`: PASS
- `node --check sw.js`: PASS
- `manifest.webmanifest`: PASS
- ZIP integrity: PASS

## Cache/version
- game.js: 152.0
- Service Worker: v152
- Manifest: 152.0
