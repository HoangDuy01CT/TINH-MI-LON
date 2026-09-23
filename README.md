# Tính Mí Lon — Bước A: Cài đặt Min–Max cho từng loại lon

Nâng cấp phần **Cài đặt cho Lon**:
- Thêm Min–Max riêng cho 6 thông số BH, CH/EH, SL (Rộng mí), ST, Tb, Te.
- Mỗi loại lon lưu bộ Min–Max riêng trong `limits`.
- Kiểm tra Min không được lớn hơn Max.
- Giữ nguyên các tiêu chí kết quả Overlap, % Overlap, % Body Hook và Gap.
- Không thay đổi công thức tính.
- Service Worker: v21.


## Bước B – Tự động kiểm tra Min–Max
- Tự kiểm tra 6 thông số BH, CH, SL, ST, Tb, Te theo Min–Max đã cài đặt riêng cho từng loại lon.
- Trường nằm trong giới hạn hiển thị ✓ Trong giới hạn; ngoài giới hạn hiển thị ✕ Ngoài giới hạn và được đánh dấu đỏ.
- Các kiểm tra Min–Max được đưa vào đánh giá chất lượng của lần tính và lưu cùng lịch sử đo.
- Không thay đổi các công thức tính mí lon hiện có.
- Service worker v22.

## Bước 3 – Quản lý loại lon nâng cao
- Có thể đổi tên và lưu ghi chú riêng cho từng loại lon.
- Có nút Nhân bản để sao chép cấu hình Min–Max và tiêu chuẩn của loại lon.
- Lịch sử đo của bản sao được bắt đầu mới, không sao chép lịch sử cũ.
- Dữ liệu vẫn lưu riêng theo từng loại lon.

## Bước 4 – Khóa Cài đặt
- Bảo vệ khu vực Min–Max và tiêu chuẩn bằng mã PIN 4–6 số.
- Mở Cài đặt lần đầu không cần PIN; người dùng có thể đặt mã PIN.
- Khi đã khóa, mở Cài đặt sẽ yêu cầu PIN.
- Có nút Khóa ngay, Đổi mã PIN và Tắt khóa.
- PIN được lưu dưới dạng SHA-256 trên thiết bị; đây là lớp khóa thao tác giao diện, không phải mã hóa dữ liệu.
- Service Worker: v24.


## Bước 5 – Kết nối Min–Max với Dashboard & Lịch sử
- Dashboard lịch sử có thêm thống kê số thông số đạt, số thông số ngoài giới hạn và tỷ lệ Min–Max.
- Các thống kê này tự động bám theo bộ lọc ngày/trạng thái hiện tại.
- Chi tiết từng lần đo hiển thị các kiểm tra Min–Max đã được lưu tại thời điểm đo.
- Xuất CSV lịch sử bổ sung cột đánh giá Min–Max.
- Không thay đổi công thức tính hoặc dữ liệu lịch sử cũ.
- Service Worker: v25.
