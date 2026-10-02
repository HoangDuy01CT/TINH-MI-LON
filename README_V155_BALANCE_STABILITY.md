# TINH MÍ LON — V155 Balance & Stability

V155 là bước chốt sau V154, tập trung vào độ ổn định và cân bằng khi chạy lâu trên desktop/mobile.

## Nội dung
- Runtime guardrails cho board 8×8 và các mảng hiệu ứng.
- Giới hạn particle/effect/toast/cascade để tránh phình bộ nhớ trong chuỗi combo dài.
- Tự sửa các giá trị animation không hợp lệ (NaN/Infinity) thay vì để canvas lỗi.
- Chống frame jump khi quay lại tab/app sau thời gian bị treo nền.
- Giữ nguyên luật Special Gem, Fusion, Combo/Cascade, Sound, Haptic và Game Feel của V150–V154.
- Debug stability nhẹ qua `window.__tinhMiLonGameDebug.getStability()`.
- Cache-busting lên V155; `game.js`, `app.js`, `sw.js` vẫn tách riêng.

## QA tĩnh
- `node --check game.js` — PASS
- `node --check sw.js` — PASS
- `python3 -m json.tool manifest.webmanifest` — PASS
- ZIP integrity — PASS

## Lưu ý
Đây là kiểm tra source/build và gói phát hành. Chưa thực hiện test vật lý trên iPhone hoặc thiết bị người dùng thật.
