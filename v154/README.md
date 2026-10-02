# TINH MÍ LON — V147

## FIX: Game không còn bị kẹt ở Hướng dẫn khi mới mở

- Mở game luôn vào giao diện game bình thường/menu.
- Không tự động mở Tutorial khi khởi động.
- Nếu trạng thái cũ bị lưu ở `tutorial`, V147 tự phục hồi về `menu`.
- Tutorial vẫn được giữ nguyên và có thể mở thủ công từ nút `📖 TUTORIAL` trong game/settings.
- Không gộp `game.js` với `app.js`; giữ nguyên cấu trúc ổn định của V146.

## Kiểm tra
- `game.js`: syntax check PASS
- `sw.js`: syntax check PASS
- `manifest.webmanifest`: JSON check PASS
- ZIP integrity: PASS
