# Tính Mí Lon — cập nhật giao diện xuất báo cáo

- Đã loại bỏ phần **BÁO CÁO KIỂM TRA MÍ LON** hiển thị trực tiếp bên dưới giao diện ứng dụng.
- Phần báo cáo chỉ được tạo khi người dùng chọn xuất CSV hoặc IN/LƯU PDF.
- Nút xuất báo cáo vẫn được giữ nguyên.
- Bản in/PDF vẫn dùng nội dung báo cáo đầy đủ.
- Service Worker: v28.


UI update v30: thẻ Khoảng trống bên trong mí ghép được tối ưu với khu vực giá trị và panel Tiêu chuẩn/Trạng thái, lấy ngưỡng Khoảng trống (gapMax) từ Cài đặt.

## UI v31 — Đồng bộ card kết quả
- Chuẩn hóa 4 card kết quả theo cùng một hệ thống full-width.
- Độ chồng mí có khu vực tiêu chuẩn/trạng thái giống Gap.
- Hai card % dùng gauge + giá trị lớn, căn chỉnh đồng nhất.
- Tối ưu khoảng cách, padding, typography và đơn vị trên iPhone.


## v32 – Tối ưu Android + iOS
- Responsive cho màn hình điện thoại Android và iPhone.
- Safe-area cho tai thỏ/Dynamic Island và thanh điều hướng.
- Tối ưu bàn phím số, phím Next/Done và chuyển ô bằng Enter.
- Tối ưu bottom sheet khi bàn phím ảo mở.
- Hỗ trợ Android PWA tốt hơn với manifest/launch handling.
- Giữ nguyên công thức, dữ liệu và các chức năng hiện có.
