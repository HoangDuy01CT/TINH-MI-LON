# Tính Mí Lon v62 — Music panel & playlist

- Một nút ♫ duy nhất mở/đóng bảng nhạc.
- Đóng bảng không dừng nhạc.
- Bảng có phát/tạm dừng, bài trước/bài tiếp, thanh âm lượng và danh sách phát.
- Danh sách hiện có 2 bài M4A. Có thể thêm MP3 bằng cách đặt file trong thư mục gốc và thêm mục tương ứng vào `MUSIC_PLAYLIST` trong `index.html`, đồng thời thêm đường dẫn file vào `CORE_ASSETS` trong `sw.js` để hỗ trợ offline.
- Không có chức năng tải MP3 từ điện thoại trực tiếp trong giao diện hiện tại; cần thêm file vào source/repository để được đóng gói và triển khai.

## Cập nhật
Thay các tệp trong gói vào đúng thư mục nguồn GitHub Pages. Chờ workflow build và deploy đều thành công.
