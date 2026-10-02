# TINH MI LON — V151 Special Fusion Engine

## Mục tiêu
Hoàn thiện tầng Fusion cho 7 Special Gem trên nền V150, giữ nguyên `app.js` và `game.js` riêng biệt.

## Fusion
- 🔥 Line + ❄️ Line → CROSS BLAST
- 💣 Bomb + 💣 Bomb → MEGA BOMB 5×5
- 🔥/❄️ Line + 💣 Bomb → SUPER BLAST (3 hàng + 3 cột)
- 🔥/❄️ Line + ⚡ Cross → CROSS OVERDRIVE
- 💣 Bomb + ⚡ Cross → CROSS BOMB
- ⚡ Cross + ⚡ Cross → MEGA CROSS
- ⚡ Lightning + Special → LIGHTNING FUSION
- ⚡ Lightning + ⚡ Lightning → THUNDER STORM
- 🌈/⭐ Color Special + Line → RAINBOW LINE
- 🌈/⭐ Color Special + Bomb → RAINBOW BOMB
- 🌈/⭐ Color Special + Cross → RAINBOW CROSS
- 🌈/⭐ Color Special + Lightning → LIGHTNING RAIN
- 🌈 + 🌈 / ⭐ + ⭐ / 🌈 + ⭐ → CRYSTAL STORM

## Điểm & phản hồi
Fusion có bonus theo cấp độ, dùng chung Combo/Score/Objective/Mission hiện tại và gọi Sound/Haptic/Juice Engine hiện có.

## An toàn hiệu năng
Hiệu ứng Fusion dùng cùng effect budget/performance profile; không tạo hệ thống particle riêng.

## Kiểm tra
- `node --check game.js`: PASS
- `node --check sw.js`: PASS
- manifest JSON: PASS
- ZIP integrity: PASS
