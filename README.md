# TINH MÌ LON — README TỔNG HỢP

**Phiên bản hiện tại: V178 — MOBILE BOOSTER INPUT FIX (game engine V176 + mobile pointer fix)**  
**Nền tảng:** Web / PWA / iPhone Safari  
**Engine:** Canvas JavaScript 8×8 Match-3

---


## V178 — MOBILE BOOSTER INPUT FIX

- Chuyển nhận `pointerup` và `pointercancel` từ Canvas lên `window` ở capture phase để tránh thất lạc sự kiện kết thúc chạm trên một số trình duyệt mobile Safari/WebView.
- Giữ `pointerdown` trên Canvas và giữ cơ chế chống kích hoạt lặp qua `lastPointerUpAt`.
- Xử lý `lostpointercapture` để xóa trạng thái chạm bị treo, tránh thao tác kế tiếp bị nuốt.
- Bump cache Service Worker và query version của `game.js` để thiết bị tải đúng bản sửa V178.

## 1. Mục tiêu dự án

TINH MÌ LON là game Match-3 8×8 với hệ thống Special Gem, Fusion, Combo/Cascade, Mission, Daily/Streak, Booster, Save/Undo, âm thanh, Haptic và giao diện PWA tối ưu cho mobile.

Các file lõi vẫn được giữ riêng:

- `index.html` — giao diện và cấu trúc PWA.
- `app.js` — lớp ứng dụng/UI và các tính năng ngoài gameplay.
- `game.js` — game engine, board, match, special, fusion, booster và level flow.
- `sw.js` — Service Worker và cache version.
- `manifest.webmanifest` — cấu hình PWA.

---

# 2. V169 — ALL BOOSTERS REBUILD

V169 là bản tập trung ổn định lại **toàn bộ 6 Booster**, thay vì sửa riêng từng booster.

## 6 Booster hiện tại

### 🔨 BÚA PHÁ Ô
- Chọn booster → chọn một ô hợp lệ.
- Phá một ô hoặc vật cản.
- Không trừ lượt.
- Chỉ tiêu 1 booster sau khi thao tác hợp lệ.
- Chọn sai không làm mất booster.

### 🔀 XÁO TRỘN
- Xáo trộn các ô có thể di chuyển.
- Không tạo sẵn match sau khi xáo.
- Phải cố gắng bảo đảm bàn vẫn có nước đi hợp lệ.
- Nếu không tìm được bàn hợp lệ, bàn cũ được hoàn nguyên và không mất booster.
- Không trừ lượt.

### ➕ +5 LƯỢT
- Tiêu đúng 1 booster.
- Cộng chính xác 5 lượt.
- Không tự tạo match hoặc combo.
- Có cơ chế cứu hộ ngắn khi lượt về 0 để người chơi vẫn có cơ hội dùng booster trước GAME OVER.

### 🚀 PHÁ HÀNG
- Chọn một ô bất kỳ trên bàn.
- Phá toàn bộ hàng chứa ô đó.
- Không trừ lượt.
- Chỉ tiêu booster sau khi chọn mục tiêu hợp lệ.

### 🌈 PHÁ MÀU
- Chọn một viên ngọc hợp lệ.
- Phá toàn bộ ngọc cùng màu.
- Không phá Stone/Lock.
- Không trừ lượt.
- Không tạo combo/special giả chỉ vì dùng booster.

### 🔄 ĐỔI CHỖ TỰ DO
- Chọn ô A.
- Chọn ô B bất kỳ, không cần liền kề.
- Đổi chỗ hai ô.
- Không trừ lượt.
- Chỉ tiêu 1 booster sau khi hai ô hợp lệ.
- Nếu tạo match/special, tiếp tục luồng resolve/cascade bình thường.
- Nếu không tạo match, vị trí mới vẫn được giữ lại.

---

# 3. Cơ chế ổn định Booster

Từ V168/V169, các Booster dùng chung một luồng xử lý:

**Bấm Booster → kiểm tra inventory → vào chế độ Booster → chọn mục tiêu → kiểm tra hợp lệ → tiêu Booster → thực hiện hiệu ứng → resolve/cascade → cập nhật mục tiêu → lưu trạng thái.**

Các nguyên tắc:

- Không tiêu booster khi thao tác chưa hợp lệ.
- Không xử lý cùng một lần chạm hai lần do `pointerup` + `click` trên iPhone.
- Có khóa giao dịch khi Booster đang chờ mục tiêu.
- Pointer capture được giải phóng sau thao tác.
- Có touch fallback cho môi trường Safari/PWA.
- Hitbox UI được mở rộng theo vùng cảm ứng mobile.

---

# 4. Level Flow & Level Map

## Hoàn thành Level

Khi mục tiêu đạt:

1. Khóa trạng thái hoàn thành.
2. Chờ cascade/resolve cần thiết kết thúc.
3. Tính sao.
4. Cập nhật best score / best moves / số lần hoàn thành.
5. Mở khóa level tiếp theo.
6. Tính phần thưởng Booster.
7. Lưu Map State.
8. Hiển thị Level Complete.

Việc hoàn thành level được khóa để tránh Safari xử lý hai lần và nhận phần thưởng trùng.

## Level Complete

Có hai hướng chính:

- **MÀN TIẾP THEO** → bắt đầu level kế tiếp.
- **BẢN ĐỒ LEVEL** → mở Level Map.

## Level Map

- Lưu level đã mở khóa.
- Lưu số sao.
- Lưu best score.
- Lưu best moves.
- Lưu số lần hoàn thành.
- `QUAY LẠI` → trở về Menu.
- Khi mở Map từ Level Complete, vị trí scroll được đưa về vùng level hợp lệ.

---

# 5. Special Gem

Hệ thống hiện có 7 loại Special Gem:

1. `row` — Line Horizontal.
2. `col` — Line Vertical.
3. `bomb` — Bomb 3×3.
4. `cross` — phá hàng + cột.
5. `lightning` — phá vùng nhiều hàng/cột.
6. `rainbow` — Color Bomb.
7. `star` — Rainbow Star.

Special được tạo dựa trên hình dạng match và cấp độ match.

---

# 6. Special Fusion

Các Fusion chính:

- Line + Line → Cross Blast.
- Bomb + Bomb → Mega Bomb.
- Line + Bomb → Super Blast.
- Line + Cross → Cross Overdrive.
- Bomb + Cross → Cross Bomb.
- Cross + Cross → Mega Cross.
- Lightning + Special → Lightning Fusion.
- Lightning + Lightning → Thunder Storm.
- Color Special + Line/Bomb/Cross → Rainbow Fusion tương ứng.
- Color Special + Lightning → Lightning Rain.
- Rainbow + Rainbow / Star + Star / Rainbow + Star → Crystal Storm.

Fusion sử dụng chung Score, Combo, Cascade, Sound, Haptic và Game Feel.

---

# 7. Score / Combo / Cascade

- Score engine thống nhất cho Match, Combo, Cascade, Special và Fusion.
- Combo multiplier tăng theo chuỗi.
- Có các tier: MATCH → COMBO → GREAT COMBO → SUPER COMBO → MEGA COMBO.
- Cascade có bonus riêng theo số viên phá và chain step.
- Special/Fusion được tính qua cùng score engine.

---

# 8. Sound / Haptic / Game Feel

- Sound profile riêng cho Match, Special và Fusion.
- Haptic có native/web/visual fallback.
- Hiệu ứng tuân theo Performance Mode và Reduced Motion.
- Board có ambient/breathing nhẹ.
- Special Gem có aura/glow riêng.
- Particle/effect được giới hạn để tránh phình bộ nhớ khi combo dài.
- Có guard cho animation `NaN/Infinity` và frame jump khi app quay lại foreground.

---

# 9. Tutorial

Tutorial được rebuild thành DOM overlay:

- Không còn Canvas Tutorial cũ.
- Điều khiển bằng nút HTML.
- Hỗ trợ touch, mouse và keyboard.
- Có schema/version riêng để nhận diện tutorial mới.
- Hoàn thành Tutorial → bắt đầu Level 1.
- Skip → trở về Menu.

---

# 10. Save / Undo / Mission / Daily

Các hệ thống nền được giữ lại:

- Save / Restore.
- Undo.
- Mission.
- Daily / Streak.
- AI Hint.
- Difficulty Scaling.
- Booster inventory.

Booster inventory có giới hạn tối đa theo loại và dữ liệu Booster cũ được bảo toàn khi nâng version.

---

# 11. Lịch sử các mốc chính

| Version | Nội dung chính |
|---|---|
| V139 | Unified Menu + Booster UI/logic |
| V146 | Rebuild Tutorial |
| V150 | Special Gem Core — 7 loại |
| V151 | Special Fusion Engine |
| V152 | Combo + Cascade + Score Engine |
| V153 | Sound + Haptic cho Special/Fusion |
| V154 | Game Feel / visual polish |
| V155 | Balance + Runtime Stability |
| V157 | Tách Music Player khỏi Game Audio |
| V158 | Match-size Audio |
| V159 | Match Voice Audio |
| V160 | Candy Style + Match Audio |
| V161 | Booster Rework |
| V162 | Level Complete + mở rộng 6 Booster |
| V164 | Level Complete + Game Over Navigation Fix |
| V165 | Booster Cleanup + bỏ thông báo Save dư thừa |
| V166 | Level Flow + 3 Booster mới |
| V167 | Booster Touch + Level Map Back Fix |
| V168 | Game Engine Stability Rebuild |
| **V169** | **Rebuild toàn bộ 6 Booster** |

---

# 12. Quy tắc nâng version / cache

Khi thay đổi `game.js`, `app.js`, `sw.js` hoặc asset quan trọng:

1. Tăng version trong source.
2. Tăng version/cache trong Service Worker.
3. Cập nhật query string của asset nếu cần.
4. Kiểm tra Service Worker không giữ file game cũ.
5. Kiểm tra PWA sau khi cập nhật.

Điều này đặc biệt quan trọng trên iPhone Safari/PWA vì cache cũ có thể khiến thiết bị vẫn chạy JavaScript của version trước.

---

# 13. Kiểm tra build

Đã kiểm tra đối với V169:

- `node --check game.js` — PASS.
- Kiểm tra cấu trúc Booster — PASS.
- Kiểm tra luồng rollback Shuffle — PASS.
- Kiểm tra cơ chế cứu hộ 0 lượt — PASS.
- Kiểm tra khóa Booster — PASS.
- ZIP integrity — PASS.

**Lưu ý:** các kiểm tra trên là kiểm tra source/build. Không tuyên bố đã thực hiện test cảm ứng vật lý trên iPhone thật.

---

# 14. Ghi chú phát triển tiếp theo

Nếu tiếp tục nâng cấp, ưu tiên theo thứ tự:

1. Test thực tế cả 6 Booster trên iPhone.
2. Kiểm tra toàn bộ state transition giữa Menu → Level Map → Playing → Booster → Level Complete → Map.
3. Chuẩn hóa toàn bộ input thành một dispatcher duy nhất nếu còn lỗi touch.
4. Kiểm tra Save/Restore khi app bị đưa xuống nền trong lúc đang dùng Booster.
5. Kiểm tra Undo sau Free Switch và các Booster tác động lên board.
6. Kiểm tra star rating khi sử dụng +5 Moves.
7. Chỉ sau khi engine ổn định mới tiếp tục thêm tính năng gameplay mới.

---

## Trạng thái hiện tại

**TINH MÌ LON V169 — ALL BOOSTERS REBUILD**  
**Ưu tiên hiện tại: ổn định gameplay và thao tác mobile trước khi tiếp tục mở rộng tính năng.**


---

## V170 — Cache Sync Hotfix

- Đồng bộ cache-busting URL của `index.html`, `sw.js` và `manifest.webmanifest` lên V170.
- Đổi tên cache Service Worker sang `tinh-mi-lon-mobile-v170-cache-sync` để trình duyệt cài lại cache mới và xóa cache cũ.
- Không thay đổi logic gameplay trong `game.js` hoặc logic ứng dụng trong `app.js`.
- README vẫn được gom thành một file duy nhất.


## V171 – Level Complete Layout Polish
- Căn lưới phần thưởng cân đối: 4 phần thưởng dùng bố cục 2×2; các hàng cuối được căn giữa.
- Tính chiều cao khung thưởng theo số hàng thực tế, tránh ô cuối tràn khỏi khung.
- Thu gọn màn hoàn thành level; bỏ các dòng gợi ý/phụ đề không cần thiết.
- Đồng bộ cache và tài nguyên lên V171.


## V172 – Booster Mechanics Rebuild

### Cơ chế đã rà soát và sửa
- **Búa phá ô:** xác định vật cản theo đúng ô được chọn (không dùng nhầm loại vật cản của màn chơi); phá một ô hợp lệ và cập nhật mục tiêu/điểm tương ứng.
- **Xáo trộn:** chỉ trừ booster sau khi tìm được bàn mới không có match sẵn và còn ít nhất một nước đi; nếu thất bại, hoàn nguyên toàn bộ loại ngọc.
- **+5 lượt:** cộng đúng 5 lượt, không trừ lượt sử dụng; có thể dùng trong giai đoạn cứu hộ khi lượt về 0.
- **Phá hàng:** chọn một hàng, xử lý đồng nhất ngọc/vật cản trong hàng, cập nhật mục tiêu clear/collect và điểm.
- **Phá màu:** chọn một ngọc hợp lệ, phá các ngọc cùng màu có thể phá; không tác động Stone/Lock.
- **Đổi chỗ tự do:** cho phép chọn hai ô không kề nhau; không trừ lượt. Nếu không tạo match, vị trí mới được giữ nguyên (không chạy nhánh hoàn tác của nước đi thường); nếu tạo match hoặc kích hoạt Special thì chạy cascade bình thường.
- Khi chọn mục tiêu booster, thao tác chạm có độ rung ngón tay nhỏ vẫn được nhận theo ô ở điểm kết thúc.

### Kiểm tra kỹ thuật
- `node --check game.js` và `node --check app.js`.
- Kiểm tra đồng bộ cache version V172 trong `index.html`, `sw.js`, `manifest.webmanifest`.
- Kiểm tra tĩnh các nhánh tiêu thụ booster và xử lý đổi chỗ tự do.
- Chưa xác nhận thao tác thực tế trên iPhone/Safari hoặc máy chủ GitHub Pages.


## V175 – Booster card cleanup
- Removed descriptive/help text from booster cards; each card now shows only icon, booster name, and inventory count.
- Removed the extra explanatory subtitle from the booster selection screen.
- Vertically centered card contents and constrained long titles to the available width.
- Updated cache and app version identifiers to V175.


## V175 — Special Gem & Fusion Engine Rebuild
- Giữ nguyên 7 Special Gem: ROW, COL, BOMB, CROSS, LIGHTNING, RAINBOW, STAR.
- Chuẩn hóa Fusion theo quy tắc xác định cho mọi cặp Special; Star là cấp cao nhất và tạo hiệu ứng toàn bàn.
- Sửa Rainbow khi đổi với ngọc thường: chỉ chọn đúng màu của viên được đổi cùng, không tự phá thêm màu của chính viên Rainbow.
- Mỗi Special trong một chuỗi chỉ kích hoạt một lần; loại bỏ kích hoạt/điểm/hiệu ứng bị gọi lặp khi Special được đổi trực tiếp.
- Special Star khi kích hoạt độc lập quét toàn bàn; Rainbow kích hoạt theo màu của chính nó khi được kích hoạt bởi cascade.
- Cache/asset version đồng bộ V175.


## V175 — Special Gem Engine Rebuild
- Giữ nguyên 7 loại Special Gem: ROW, COL, BOMB, CROSS, LIGHTNING, RAINBOW, STAR.
- Chuẩn hóa hiệu ứng kích hoạt độc lập và hiệu ứng Fusion theo cặp.
- STAR kích hoạt độc lập sẽ quét toàn bàn; Fusion có STAR cũng là hiệu ứng cấp cao nhất.
- RAINBOW khi đổi với ngọc thường nhắm đúng màu của viên được đổi; khi kết hợp Special sẽ biến mọi viên cùng màu thành hiệu ứng tương ứng.
- Mỗi Special trong một chuỗi resolve chỉ kích hoạt một lần; Special mới tạo trong lượt match không bị kích hoạt nhầm ngay khi vừa sinh ra.
- Giữ nguyên giao diện Booster V173 và tài nguyên game. Cache được đồng bộ V175.


## V175 — Quy cách lon & đối chiếu kết quả (bổ sung)

- Thêm nút **QUY CÁCH LON** phía trên phần Thông số mí ghép trong màn hình từng loại lon.
- Mỗi loại lon lưu bộ quy cách riêng trong dữ liệu trên thiết bị; hỗ trợ tự tạo nhóm và thông số, nhập giá trị tiêu chuẩn, dung sai ± và đơn vị.
- Có thể liên kết một thông số quy cách với BH, CH, SL, ST, Tb, Te hoặc các kết quả tính: độ chồng mí, % độ chồng mí, % móc thân và khoảng trống.
- Chức năng đối chiếu chỉ chạy trong trang Quy cách khi người dùng mở trang; sử dụng dữ liệu của lần tính gần nhất đã lưu.
- Thông số không liên kết chỉ được lưu để tham khảo; thông số chưa có dữ liệu/tiêu chuẩn không bị kết luận Đạt.
- Không thay đổi công thức tính mí, đánh giá mặc định, lịch sử đo hoặc game engine.
- Đồng bộ cache Service Worker cho app.js mới; game.js giữ nguyên V175.
