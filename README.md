# Tính Mí Lon

Ứng dụng web (PWA) tính tỷ lệ chồng mí lon cho các loại lon số 2, số 3 (Dẹp/Vừa/Cao), số 5, A10. Cài lên màn hình chính iPhone để dùng như một app thật (không cần App Store).

## Có gì mới trong bản nâng cấp này

- **Lịch sử đo (🕘)**: mỗi lần bấm "Tính kết quả" sẽ tự lưu lại một dòng lịch sử (thời gian + 6 thông số + kết quả) cho từng loại lon, tối đa 50 dòng gần nhất. Bấm vào một dòng để nạp lại số liệu, hoặc xóa từng dòng/xóa hết.
- **Xuất CSV**: xuất toàn bộ lịch sử ra file CSV (mở được bằng Excel) để lưu hồ sơ kiểm tra.
- **Ngưỡng đánh giá Đạt/Chưa đạt (⚙️)**: đặt ngưỡng % Overlap và % Body Hook tối thiểu riêng cho từng loại lon, kết quả sẽ tự gắn nhãn "Đạt" (xanh) / "Chưa đạt" (đỏ). Giá trị 45% / 70% chỉ là gợi ý mặc định — hãy chỉnh theo tiêu chuẩn thực tế của nhà máy. Để trống nếu không cần đánh giá.
- **Chia sẻ kết quả**: gửi nhanh kết quả qua Messages/Zalo/Mail hoặc sao chép vào clipboard.
- **Giao diện tối (Dark Mode)**: tự chuyển theo cài đặt hệ thống của iPhone.
- **Icon & màn hình chờ riêng cho app**: icon hình lon với đường mí ghép, có splash screen tối ưu cho iPhone 14 Pro Max khi mở app từ màn hình chính.
- Công thức tính toán giữ nguyên 100% như bản gốc, không thay đổi số liệu kỹ thuật.

## Cài lên iPhone như một app (Add to Home Screen)

1. Deploy trang lên GitHub Pages (xem bên dưới) để có địa chỉ `https://...github.io/...`.
2. Trên iPhone, mở địa chỉ đó bằng **Safari** (bắt buộc phải là Safari, không phải Chrome).
3. Bấm nút **Chia sẻ** (hình vuông có mũi tên đi lên) → chọn **"Thêm vào MH chính" / "Add to Home Screen"**.
4. Bấm **Thêm/Add**. Icon app sẽ xuất hiện ở màn hình chính, mở lên sẽ chạy toàn màn hình như app thật, có splash screen riêng, hoạt động cả khi không có mạng.

## Deploy lên GitHub Pages

1. Tạo repo mới trên GitHub, đẩy (push) toàn bộ nội dung thư mục này lên nhánh `main`.
2. Vào **Settings → Pages** của repo → mục **Source** chọn nhánh `main`, thư mục `/ (root)` → Save.
3. Sau 1–2 phút, trang sẽ có ở `https://<tên-tài-khoản>.github.io/<tên-repo>/`.
4. Mở link đó bằng Safari trên iPhone và làm theo bước "Cài lên iPhone" ở trên.

> Lưu ý: mỗi khi bạn sửa code và push bản mới, hãy đổi số phiên bản `CACHE_NAME` trong `sw.js` (ví dụ `v4` → `v5`) để iPhone tải lại bản mới thay vì dùng bản cache cũ.

## Cấu trúc file

```
index.html                 giao diện + toàn bộ logic tính toán
manifest.webmanifest        khai báo app cho "Add to Home Screen"
sw.js                        service worker (cho phép dùng offline)
icons/icon-192.png           icon app
icons/icon-512.png           icon app (độ phân giải cao)
icons/apple-touch-icon.png   icon riêng cho iOS
icons/favicon-32.png         favicon cho tab trình duyệt
icons/splash-1290x2796.png   màn hình chờ khi mở app trên iPhone 14 Pro Max
```

Dữ liệu (số liệu nhập, lịch sử, ngưỡng đánh giá) được lưu **trên chính thiết bị** (localStorage), không gửi lên máy chủ nào — gỡ app hoặc xóa dữ liệu Safari sẽ mất dữ liệu đã lưu.
