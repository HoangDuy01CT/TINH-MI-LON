# TÍNH MÍ LON — V181 (đã loại bỏ trò chơi)

Ứng dụng web/PWA dùng để nhập thông số mí ghép lon, tính toán các chỉ số kỹ thuật, đánh giá theo ngưỡng do người dùng thiết lập và lưu lịch sử đo trên thiết bị.

## Chức năng được giữ lại

- Tính độ chồng mí, phần trăm độ chồng mí, phần trăm móc thân và khoảng trống bên trong mí ghép.
- Quản lý loại lon và lưu thông số nhập riêng theo từng loại.
- Thiết lập giới hạn Min–Max và đánh giá Đạt / Cần theo dõi / Không đạt.
- Quản lý quy cách kỹ thuật, đối chiếu kết quả, xem và xuất lịch sử.
- Xuất báo cáo, chia sẻ kết quả, cài đặt giao diện và ngôn ngữ.
- Trình phát nhạc nền và danh sách nhạc cá nhân vẫn được giữ nguyên.
- PWA, Service Worker và các biểu tượng ứng dụng vẫn được giữ nguyên.

## Thành phần chính

- `index.html` — giao diện ứng dụng và các hộp thoại.
- `app.js` — logic tính toán, lưu trữ, lịch sử, cài đặt và trình phát nhạc.
- `sw.js` — Service Worker và quản lý bộ nhớ đệm ngoại tuyến.
- `manifest.webmanifest` — cấu hình PWA.
- `icons/` — biểu tượng ứng dụng và ảnh khởi động.
- `song-city.mp3`, `song-10k-years.mp3` — nhạc nền của trình phát nhạc.

## Đã loại bỏ

- Trò chơi Bejeweled / Match-3 và nút biểu tượng game.
- Các màn hình, giao diện, sự kiện BOOST và mã game.
- Thư mục ảnh/âm thanh riêng của game và tệp `game.js`.
- Các mục game trong danh sách precache của Service Worker.

## Triển khai GitHub Pages

1. Sao lưu phiên bản đang chạy trước khi thay thế.
2. Giải nén gói này và tải nội dung bên trong thư mục dự án lên đúng nhánh/thư mục GitHub Pages đang triển khai.
3. Đảm bảo `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/` và hai tệp nhạc nằm đúng vị trí tương đối như trong gói.
4. Mở lại trang ứng dụng. Service Worker V181 sẽ thay cache cũ và dọn các cache `tinh-mi-lon-mobile-*` trước đó.
5. Nếu iPhone vẫn hiển thị giao diện cũ, đóng hẳn PWA/Safari rồi mở lại trang GitHub Pages để nhận Service Worker mới.

## Kiểm tra kỹ thuật

- `app.js` và `sw.js` cần vượt qua kiểm tra cú pháp JavaScript bằng `node --check`.
- Không còn thẻ tải `game.js`, nút `gameToggle`, modal Bejeweled hoặc đường dẫn `game/images/` trong ứng dụng.
- Không thay đổi công thức tính mí hoặc cấu trúc dữ liệu lưu lịch sử trong lần loại bỏ game này.
