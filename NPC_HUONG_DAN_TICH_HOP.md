# NPC trợ lý — tích hợp vào TÍNH MÍ LON (V182)

## Đã làm gì so với bản V181
- `index.html`: thêm 4 dòng `<script>` trước `</body>` (cấu hình, lời thoại, bundle NPC, khởi tạo).
- `sw.js`: đổi `CACHE_NAME` thành `...V182-npc` và thêm file NPC + 61 ảnh sprite vào cache để chạy offline.
- Thư mục mới `npc/` (config, dist, sprites). **`app.js`, `style.css` và công thức tính toán không bị sửa.**

## Đưa lên GitHub Pages
1. Giải nén ZIP, chép toàn bộ nội dung (kể cả thư mục `npc/`) đè lên repo, giữ nguyên cấu trúc.
2. Commit + push. Mở trang, tải lại cứng (Ctrl+F5) hoặc đóng hẳn PWA rồi mở lại để service worker nhận bản V182.
3. Nút "NPC: BẬT/TẮT" ở góc trái dưới; trạng thái được lưu trong trình duyệt.

## NPC đọc gì từ website
Ô `#BH #CH #SL #ST #Tb #Te`, nút `.menu .main-btn/.sub-btn`, nút `.btn.calc`, vùng kết quả/đánh giá (`#qualityStatus`, `#qualityDetail`) và giới hạn Min–Max do chính người dùng thiết lập (qua `limitFor`). NPC **không tự đặt thông số kỹ thuật**; nội dung giải thích trong `npc/config/npc.guide.vi.js` đánh dấu `reviewed:false` — bạn cần rà soát lại cho đúng quy định nhà máy.

## Giới hạn đã biết
- Chỉ có tiếng Việt (chưa theo chế độ tiếng Anh của web).
- Màn hình điện thoại hẹp (~390px) không có lề trống: NPC đứng ở khe giữa các khối và bong bóng có thể che một phần ô khác; bấm × để đóng.
- Đã thử bằng Chromium (desktop + khung iPhone), **chưa thử trên iPhone/Safari thật**.
- Khi mở Cài đặt/PIN/QR/Giới thiệu, NPC tự ẩn.

## Gỡ NPC
Xóa 4 dòng `<script>` trong `index.html` (web chạy như cũ). Tạm tắt: bấm nút NPC: TẮT.
