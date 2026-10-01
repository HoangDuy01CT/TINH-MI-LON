# TINH MI LON V143

## Tutorial
- Đồng bộ Sapphire/Gold với Menu, Missions, Level Map và Boosters.
- Sáu trang hướng dẫn dùng mini-board 3x3 với artwork ngọc thật.
- Pointer và click fallback dùng chung layout/hitbox.
- Tutorial schema version 2.

## Performance
- Không còn bỏ xen kẽ frame khi máy chậm; giảm tải render thay vì làm cascade trông như đứng hình.
- Balanced giảm DPR/effects/particles mặc định.
- First-touch audio chỉ unlock một audio element thay vì toàn bộ pool.
- Bàn 8x8 bỏ 64 gradient tạo lại mỗi frame.
- Background bỏ radial gradient mỗi frame.
- Giảm shadow ở quality thấp.
- Gem sprite smoothing không lặp lại cho từng viên.

## Validation
- game.js syntax PASS
- sw.js syntax PASS
- manifest JSON PASS
- ZIP integrity PASS
