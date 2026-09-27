# Tính Mí Lon – Giai đoạn 3 (v57)

## Trọng tâm: hoàn thiện trải nghiệm sử dụng
- Loại bỏ đoạn xử lý bàn phím/viewport bị lặp, tránh gắn sự kiện hai lần cho 6 ô nhập.
- Thông báo toast có `role=status` và `aria-live=polite` để trình đọc màn hình có thể thông báo trạng thái.
- Thông báo ngoại tuyến đi qua bộ dịch hiện hành để phù hợp ngôn ngữ đã chọn.
- Giới hạn lựa chọn ngôn ngữ ở Tiếng Việt và English; giá trị ngôn ngữ cũ không còn hỗ trợ sẽ tự quay về Tiếng Việt.
- Giữ nguyên công thức tính, dữ liệu loại lon, lịch sử, giao diện màu và hai bài nhạc.

## Cập nhật
Giải nén và thay toàn bộ nội dung trên GitHub Pages. Trước khi cập nhật, nên sao lưu dữ liệu quan trọng bằng chức năng xuất hiện có. Mở app khi có mạng để nhận Service Worker mới.

## Phạm vi kiểm tra
Đã kiểm tra cú pháp JavaScript và cấu trúc ZIP sau khi đóng gói. Chưa thực hiện kiểm thử giao diện trực tiếp trên thiết bị iOS/Android.
