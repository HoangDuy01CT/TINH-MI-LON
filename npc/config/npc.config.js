/* =====================================================================
   NPC TÍNH MÍ LON — CẤU HÌNH HÀNH VI cho website Tính Mí Lon (V182)
   Chỉ ghi những mục khác mặc định. Xem thêm chú thích trong gói NPC gốc (npc.config.js).
   ===================================================================== */
window.TML_NPC_CONFIG = {
  enabled: true,                 // lần đầu vào trang: NPC bật; sau đó theo lựa chọn đã lưu của người dùng
  storageKey: "tml-npc.v1",

  scale: 0.8,                    // 64×115 px
  smallScreen: { maxWidth: 640, scale: 0.62 },   // iPhone / điện thoại
  startPosition: { corner: "bottom-left", offsetX: 14, offsetY: 64 },

  toggle: { show: true, position: "bottom-left", offsetX: 14, offsetY: 14 },

  roaming: {
    enabled: true,
    speed: 46, runSpeed: 140,
    restMs: [2200, 6000],
    distance: [80, 260],
    // Đi dạo trong khu vực ứng dụng (.container) + phần lề hai bên trên màn hình rộng
    area: { selector: ".container", expand: { left: 260, right: 260, top: 0, bottom: 0 }, padding: 8 }
  },

  collision: {
    padding: 8,
    // Thành phần của website mà NPC phải tránh (ngoài nút/ô nhập/nhãn mặc định)
    extraAvoid: ".music-volume-pop.show,.save-indicator.show,.update-card.show,.network-pill,.contact-qr-trigger,.history-count",
    extraContent: ".field,.result-card,.quality-card,.section-title,.hint,.formula-note,.app-brand-row,.menu-toolbar,.topbar,.spec-entry-card,.calc-title"
  },

  // Khi bất kỳ hộp thoại/bảng cài đặt nào của website đang mở → NPC và nút ON/OFF tự ẩn
  suspendWhen: [
    "body:has(.sheet-overlay.open)", "body:has(.pin-overlay.open)",
    "body:has(.contact-qr-modal.open)", "body:has(.author-modal.open)"
  ],

  guidance: { standGap: 54, holdMs: 15000, blurHoldMs: 3500, afterGuide: "roam", showStep: true },
  dialogue: { maxWidth: 262, cooldownMs: 25000, idleChat: { enabled: true, everyMs: [50000, 100000] } }
};
