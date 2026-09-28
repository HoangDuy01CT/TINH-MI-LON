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
