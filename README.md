# Tính Mí Lon v63 — Nhập nhạc từ thiết bị

## Thay đổi
- Bảng nhạc ♫ có nút **＋ Thêm nhạc từ thiết bị**: chọn một hoặc nhiều file âm thanh (MP3, M4A, AAC, WAV, OGG, OPUS, FLAC) từ điện thoại hoặc laptop.
- Trên laptop có thể **kéo thả file** vào bảng nhạc.
- Bài nhập được lưu trong IndexedDB của trình duyệt, nên vẫn còn sau khi tắt/mở lại app và chạy được khi offline. Không cần sửa source hay deploy lại.
- Bài nhập có nút 🗑 để xóa. Hai bài gốc của app không xóa được.
- Ghi nhớ bài đang chọn, kể cả bài nhập. Tự bỏ qua file trùng, file không phải âm thanh và file lớn hơn 80MB.
- Service Worker/cache nâng lên v63.

## Lưu ý
- Nhạc nhập chỉ nằm trên **thiết bị đã nhập**. Điện thoại và laptop có danh sách riêng.
- Nhạc nhập không nằm trong phần sao lưu dữ liệu của app. Xóa dữ liệu trình duyệt hoặc gỡ app sẽ mất các bài này.
- Trên iPhone, nên dùng app đã "Thêm vào Màn hình chính" để iOS ít xóa dữ liệu hơn.
- Một số định dạng (ví dụ FLAC trên iOS cũ) có thể không phát được; app sẽ báo khi gặp.

## Cập nhật
Thay các tệp trong gói vào đúng thư mục nguồn GitHub Pages. Chờ workflow build và deploy thành công, rồi mở app khi có mạng để nhận Service Worker mới.

## Phạm vi kiểm tra
Đã kiểm tra cú pháp JavaScript và Service Worker, cùng logic thêm/xóa/khôi phục bài bằng môi trường giả lập (jsdom + IndexedDB giả). Chưa thử trực tiếp trên iOS/Android thật.


## v74 – Giai đoạn 1
- Thêm sao lưu dữ liệu loại lon, thông số, tiêu chuẩn và lịch sử ra file JSON.
- Thêm khôi phục từ file JSON có kiểm tra cấu trúc và xác nhận trước khi thay thế dữ liệu.
- Thêm tự kiểm tra 4 công thức bằng bộ dữ liệu tham chiếu.
- Tăng phiên bản cache Service Worker lên v74.
- Giữ nguyên các công thức tính hiện có.


## v75 – Tối ưu game và iPhone 14
- Tối ưu canvas game trên màn hình dọc và vùng an toàn (safe area) của iPhone.
- Giới hạn devicePixelRatio của canvas ở mức 2 để giảm tải GPU nhưng vẫn giữ hình ảnh sắc nét.
- Dừng vòng render `requestAnimationFrame` khi đóng game hoặc đưa app xuống nền, giúp giảm CPU/pin.
- Sửa vùng chạm HINT/MENU để khớp chính xác với vị trí nút hiển thị.
- Bổ sung thao tác vuốt để đổi hai viên đá liền kề trên màn hình cảm ứng.
- Cải thiện xử lý resize/Visual Viewport cho iOS.
- Cache Service Worker nâng lên v75 để tránh dùng nhầm game.js cũ.


## v78 – Bước 1: Làm lại viên kim cương
- Thay phần hiển thị gem PNG bằng crystal 2.5D vẽ trực tiếp trên Canvas.
- Mỗi màu có bảng màu và facet riêng, có gradient, bevel, viền, highlight và bóng nhẹ.
- Kích thước gem vẫn bám theo ô 8×8 nên không làm thay đổi logic bàn chơi.
- Gem special giữ biểu tượng và vòng sáng.
- Không thay đổi logic tính điểm, match, combo, swap hoặc phần tính mí lon.
- Cache Service Worker nâng lên v78.


## V80 - Crystal Game Board
Bước 3: nâng cấp riêng khung bàn 8×8 thành crystal/glass board, giữ nguyên gem V78 và background V79.


## V85 – Bước 7 & 8: Mobile Controls + Gameplay Progression
- Hoàn thiện vùng chạm HINT / SOUND / MENU trên HUD cho thao tác cảm ứng.
- MENU trong lúc chơi mở màn hình PAUSED với RESUME / RESTART / MENU.
- SOUND ON/OFF được lưu trên thiết bị bằng localStorage.
- Tiến trình level tăng theo mục tiêu riêng của từng level; lên level cộng 5 moves.
- Cảnh báo khi còn 5 moves trở xuống.
- Khi không còn nước đi hợp lệ, bàn tự xáo trộn và thông báo SHUFFLED.
- Giữ nguyên 8x8, crystal gems, background, crystal board, match/cascade, sound và HUD.
- Service Worker/cache nâng lên v85.
- Đã kiểm tra cú pháp game.js và sw.js.
