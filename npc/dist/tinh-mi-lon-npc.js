/*! NPC TÍNH MÍ LON v0.5.0 — bản đóng gói từ src/ (đừng sửa tay, hãy sửa trong src/ rồi chạy node tools/build.js) */

/* ===== 00-util.js ===== */
/* NPC TÍNH MÍ LON — Tiện ích dùng chung */
(() => {
  "use strict";
  const NS = (window.TinhMiLonNPC = window.TinhMiLonNPC || {});
  NS.version = "0.5.0";
  NS.M = NS.M || {};
  const U = (NS.util = {});

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.toArray = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
  U.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const isPlain = v => v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;
  U.deepMerge = function merge(target, ...sources) {
    for (const src of sources) {
      if (!isPlain(src)) continue;
      for (const key of Object.keys(src)) {
        const val = src[key];
        if (isPlain(val)) target[key] = merge(isPlain(target[key]) ? target[key] : {}, val);
        else if (Array.isArray(val)) target[key] = val.slice();
        else if (val !== undefined) target[key] = val;
      }
    }
    return target;
  };

  /** Thay {tên} trong chuỗi mẫu; mẫu có thể là hàm (ctx) => chuỗi. */
  U.fmt = (tpl, vars) => {
    if (typeof tpl === "function") { try { return String(tpl(vars || {}) ?? ""); } catch (e) { return ""; } }
    if (tpl == null) return "";
    return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : ""));
  };

  U.mkRect = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
  U.rect = el => {
    const r = el.getBoundingClientRect();
    return U.mkRect(r.left, r.top, r.right, r.bottom);
  };
  U.expand = (r, p) => U.mkRect(r.left - p, r.top - p, r.right + p, r.bottom + p);
  U.overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  U.overlapArea = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };

  U.isShown = el => {
    if (!el || !el.isConnected) return false;
    if (!el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  U.viewW = () => document.documentElement.clientWidth || window.innerWidth;
  U.viewH = () => window.innerHeight || document.documentElement.clientHeight;

  U.reducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  U.emitter = () => {
    const map = new Map();
    return {
      on(ev, fn) {
        if (!map.has(ev)) map.set(ev, new Set());
        map.get(ev).add(fn);
        return () => map.get(ev) && map.get(ev).delete(fn);
      },
      off(ev, fn) { map.get(ev) && map.get(ev).delete(fn); },
      emit(ev, payload) {
        const set = map.get(ev);
        if (!set) return;
        for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error("TÍNH MÍ LON NPC:", e); } }
      },
      clear() { map.clear(); }
    };
  };

  U.rafThrottle = fn => {
    let id = 0, args;
    const wrapped = (...a) => { args = a; if (!id) id = requestAnimationFrame(() => { id = 0; fn(...args); }); };
    wrapped.cancel = () => { if (id) cancelAnimationFrame(id); id = 0; };
    return wrapped;
  };

  U.debounce = (fn, ms) => {
    let t = 0;
    const wrapped = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    wrapped.cancel = () => clearTimeout(t);
    return wrapped;
  };

  /** Số theo kiểu Việt Nam: chấp nhận dấu phẩy thập phân. Trả NaN nếu không hợp lệ. */
  U.parseNumber = raw => {
    let s = String(raw ?? "").trim();
    if (!s) return NaN;
    if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  };

  U.joinVi = list => {
    const a = list.filter(Boolean);
    if (a.length <= 1) return a[0] || "";
    return a.slice(0, -1).join(", ") + " và " + a[a.length - 1];
  };
})();

/* ===== sprite manifest (nhúng sẵn để chạy được cả khi mở file trực tiếp, không cần máy chủ) ===== */
(() => { window.TinhMiLonNPC.EMBEDDED_MANIFEST = {"frameSize":{"width":80,"height":144},"source":"assets/source/sprite_sheet_background_removed.png","directions":{},"states":{"idle":{"down":["sprites/idle/00.png"],"right":["sprites/idle/01.png"],"up":["sprites/idle/02.png"],"left":["sprites/idle/03.png"]},"walk":{"down":["sprites/walk/down/00.png","sprites/walk/down/01.png","sprites/walk/down/02.png"],"right":["sprites/walk/right/00.png","sprites/walk/right/01.png","sprites/walk/right/02.png","sprites/walk/right/03.png"],"up":["sprites/walk/up/00.png","sprites/walk/up/01.png","sprites/walk/up/02.png","sprites/walk/up/03.png"],"left":["sprites/walk/left/00.png","sprites/walk/left/01.png","sprites/walk/left/02.png","sprites/walk/left/03.png"]},"run":{"down":["sprites/run/down/00.png","sprites/run/down/01.png","sprites/run/down/02.png","sprites/run/down/03.png"],"right":["sprites/run/right/00.png","sprites/run/right/01.png","sprites/run/right/02.png","sprites/run/right/03.png"],"up":["sprites/run/up/00.png","sprites/run/up/01.png","sprites/run/up/02.png","sprites/run/up/03.png"],"left":["sprites/run/left/00.png","sprites/run/left/01.png","sprites/run/left/02.png","sprites/run/left/03.png"]},"jump":{"down":["sprites/jump/down/00.png","sprites/jump/down/01.png","sprites/jump/down/02.png"],"right":["sprites/jump/right/00.png","sprites/jump/right/01.png","sprites/jump/right/02.png","sprites/jump/right/03.png"],"up":["sprites/jump/up/00.png","sprites/jump/up/01.png","sprites/jump/up/02.png","sprites/jump/up/03.png"],"left":["sprites/jump/left/00.png","sprites/jump/left/01.png","sprites/jump/left/02.png","sprites/jump/left/03.png"]},"sit":{"frames":["sprites/sit/00.png","sprites/sit/01.png","sprites/sit/02.png","sprites/sit/03.png"]},"lie":{"frames":["sprites/lie/00.png","sprites/lie/01.png","sprites/lie/02.png"]},"interact":{"frames":["sprites/interact/00.png","sprites/interact/01.png","sprites/interact/02.png","sprites/interact/03.png"]}},"notes":["Frames extracted from the supplied transparent sprite sheet using connected-component bounds.","Direction labels are provisional based on the visual order in the source sheet; verify in the preview before production use.","All frames are nearest-neighbor normalized to 80x144 transparent canvases."]}; })();

/* ===== 10-settings.js ===== */
/* NPC TÍNH MÍ LON — NPC Settings: cấu hình mặc định, hợp nhất cấu hình, lưu trạng thái */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;

  NS.DEFAULTS = {
    enabled: true,               // trạng thái ban đầu nếu người dùng chưa từng bật/tắt
    persist: true,               // lưu ON/OFF (và Auto Roaming) vào localStorage
    storageKey: "tml-npc.v1",
    assetBase: null,             // null = tự suy ra từ đường dẫn file script
    manifest: null,              // null = dùng manifest nhúng sẵn
    scale: 1,
    smallScreen: { maxWidth: 640, scale: 0.72 },
    zIndex: 100000,
    startPosition: { corner: "bottom-right", offsetX: 28, offsetY: 28 },

    toggle: {
      show: true, position: "bottom-left", offsetX: 16, offsetY: 16,
      mount: null,               // selector: gắn nút vào một vị trí có sẵn của website (không cố định)
      labelOn: "NPC: BẬT", labelOff: "NPC: TẮT",
      roamingSwitch: false       // hiện thêm nút Bật/Tắt đi dạo cạnh nút NPC
    },

    roaming: {
      enabled: true,             // Auto Roaming mặc định
      speed: 54,                 // px/giây khi đi bộ
      runSpeed: 150,             // px/giây khi chạy
      runChance: 0.06,           // xác suất chạy thay vì đi bộ ở mỗi lượt
      restMs: [1800, 5200],      // thời gian đứng nghỉ giữa hai lượt đi
      distance: [90, 300],       // khoảng cách mỗi lượt đi
      turnChance: 0.35,          // xác suất quay đầu khi đang nghỉ
      resumeAfterGuideMs: 2500,  // chờ bao lâu rồi đi dạo lại sau khi hướng dẫn xong
      area: {
        selector: null,          // null = toàn bộ vùng nhìn thấy; hoặc selector của khu vực Tính Mí Lon
        expand: { top: 0, right: 0, bottom: 0, left: 0 }, // mở rộng khu vực ra lề (px)
        padding: 10
      }
    },

    animation: { speed: 1, breathing: true },

    collision: {
      mode: "body",              // "body": cả thân người không được đè lên vật cản | "feet": chỉ phần chân
      inset: { x: 0.16, y: 0.03 },
      feetHeight: 0.22,
      padding: 10,
      gridCell: 12,
      avoidSelector: "a[href],button,input,select,textarea,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=menuitem],[contenteditable=true],summary,iframe,video,audio,canvas,[data-tml-avoid]",
      contentSelector: "label,legend,h1,h2,h3,h4,th,table,img,pre,[data-tml-content]",
      extraAvoid: "",            // selector bổ sung cho vật cản tương tác của website
      extraContent: "",          // selector bổ sung cho vật cản là nội dung (không bắt buộc tránh khi chật)
      ignoreSelector: "[data-tml-ignore]",
      maxObstacleViewportRatio: 0.6,
      extraRects: []
    },

    guidance: {
      enabled: true,
      autoGo: true,              // NPC tự đi tới trường dữ liệu
      standGap: 54,              // khoảng cách NPC – trường (chỗ cho mũi tên)
      preferredSides: ["right", "left", "bottom", "top"],
      holdMs: 15000,             // thời gian đứng chờ cạnh trường sau khi hướng dẫn
      blurHoldMs: 3500,          // đứng chờ thêm bao lâu sau khi người dùng rời khỏi trường
      debounceMs: 120,
      onFocus: true,
      onChange: true,
      showStep: true,            // hiện "Bước x/y" trong bong bóng
      scrollIntoView: true,
      runDistance: 380,          // quãng đường dài hơn mức này thì chạy
      viewPadding: 10,
      retargetTolerance: 6,
      resultWaitMs: 2500,
      inputFeedbackMs: 700,
      afterGuide: "roam"         // "roam": quay lại đi dạo | "wait": đứng chờ tại chỗ
    },

    dialogue: {
      minMs: 4000, perCharMs: 50, maxMs: 14000,
      maxWidth: 272,
      cooldownMs: 25000,         // không lặp lại cùng một lời thoại trong khoảng này
      closeButton: true,
      greeting: true, greetingDelayMs: 900,
      idleChat: { enabled: true, everyMs: [45000, 90000] }
    },

    pointer: { enabled: true, ring: true },

    suspendWhen: [],             // selector CSS: khi trang khớp (vd. "body:has(.sheet-overlay.open)") NPC và nút ON/OFF tự ẩn (hộp thoại đang mở)
    manualControl: false,        // true: cho phép phím mũi tên điều khiển NPC khi NPC đang được focus
    clickToTalk: true,
    debug: false
  };

  /** Nội dung hội thoại mặc định (tiếng Việt). Có thể ghi đè trong config/npc.guide.vi.js */
  NS.DEFAULT_GUIDE = {
    fields: {},
    workflow: [],
    actions: {
      calculate: { selectors: [], matchText: "^\\s*(t[íi]nh|t[íi]nh\\s*to[áa]n|calculate)\\b", label: "nút Tính" },
      result: { selector: null, label: "khu vực kết quả", mode: "afterClick", match: null, target: null, describe: null },
      error: { selector: null, match: null }
    },
    messages: {
      greeting: "Xin chào! Mình là trợ lý TÍNH MÍ LON. Bạn bấm vào ô nào, mình sẽ đến chỉ và giải thích ô đó nhé.",
      clickTips: [
        "Bấm vào một ô nhập liệu, mình sẽ đến đứng cạnh và giải thích ngay.",
        "Muốn mình nghỉ ngơi? Dùng nút “NPC: BẬT/TẮT” ở góc màn hình nhé.",
        "Nhập đủ các thông số rồi bấm nút tính, mình sẽ nhắc nếu còn thiếu."
      ],
      idleChat: [
        "Bạn cứ thong thả nhập số liệu, mình ở đây hỗ trợ.",
        "Nhớ kiểm tra lại số liệu đo thực tế trước khi tính nhé."
      ],
      step: "Bước {step}/{total}",
      selectDefault: "Bạn đã chọn “{value}”. Hãy kiểm tra các thông số cần nhập cho lựa chọn này.",
      selectDefaultNext: "Bạn đã chọn “{value}”. Các thông số cần nhập tiếp theo: {fieldsToFill}.",
      validOk: "Đã nhận {label}: {value}.",
      validNext: "Đã nhận {label}: {value}. Tiếp theo hãy nhập {next}.",
      allFilled: "Đã đủ các thông số bắt buộc. Bạn có thể bấm {calc} để tính.",
      invalidNumber: "{label} chưa hợp lệ: cần nhập một số (ví dụ 1,5 hoặc 1.5).",
      invalidMin: "{label} đang nhỏ hơn mức tối thiểu {min}.",
      invalidMax: "{label} đang lớn hơn mức tối đa {max}.",
      invalidPattern: "{label} chưa đúng định dạng yêu cầu.",
      outOfLimit: "{label} = {value} đang nằm ngoài giới hạn Min–Max bạn đã thiết lập ({range}).",
      invalidGeneric: "{label} chưa hợp lệ. Bạn kiểm tra lại giúp mình nhé.",
      missingOne: "Bạn chưa nhập {list}.",
      missingMany: "Còn thiếu: {list}. Hãy nhập đủ rồi bấm tính lại.",
      problemsMixed: "Cần xem lại: {list}. Hãy sửa rồi bấm tính lại.",
      calcSuccess: "Hoàn thành! Đã có kết quả tính toán.",
      calcSuccessGuide: "Hoàn thành! Kết quả hiển thị ở {resultLabel}. Hãy đọc từng giá trị kèm đơn vị và đối chiếu với tiêu chuẩn của nhà máy.",
      calcError: "Có lỗi khi tính toán. Bạn kiểm tra lại các thông số đã nhập nhé.",
      titleError: "Chưa thể tính",
      titleWarn: "Lưu ý",
      titleSuccess: "Hoàn thành",
      titleInfo: "Hướng dẫn",
      reducedMotion: "Chế độ giảm chuyển động đang bật nên mình sẽ không tự đi dạo."
    }
  };

  NS.M.Settings = {
    build(options) {
      const cfg = U.deepMerge({}, NS.DEFAULTS, window.TML_NPC_CONFIG || {}, options || {});
      cfg.guide = U.deepMerge({}, NS.DEFAULT_GUIDE, window.TML_NPC_GUIDE || {}, (options && options.guide) || {});
      // fields có thể chứa RegExp/hàm: giữ nguyên tham chiếu (deepMerge chỉ nhân bản object thuần)
      const srcFields = Object.assign({}, (window.TML_NPC_GUIDE || {}).fields || {}, ((options && options.guide) || {}).fields || {});
      cfg.guide.fields = srcFields;
      return cfg;
    },
    store(cfg) {
      const key = cfg.storageKey;
      const read = () => {
        if (!cfg.persist) return {};
        try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
      };
      const write = patch => {
        if (!cfg.persist) return;
        try { localStorage.setItem(key, JSON.stringify(Object.assign(read(), patch))); } catch (e) { /* localStorage bị chặn */ }
      };
      return { read, write, clear() { try { localStorage.removeItem(key); } catch (e) { /* bỏ qua */ } } };
    }
  };
})();

/* ===== 20-animation.js ===== */
/* NPC TÍNH MÍ LON — NPC Animation: quản lý sprite, hướng nhìn, hoạt ảnh */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const DIRS = ["down", "left", "right", "up"];
  const INTERVALS = { idle: 260, walk: 150, run: 105, jump: 135, interact: 210, sit: 300, lie: 300 };
  // Khung "interact" trong sprite: 0 bình thường, 1 dấu ?, 2 vui/tim, 3 dấu !
  const EXPR = { neutral: 0, question: 1, happy: 2, alert: 3 };

  NS.M.Animation = function Animation(core) {
    const { cfg, ui } = core;
    const sprite = ui.sprite;
    const manifest = core.manifest;
    let state = "idle", dir = "down", frame = 0, timer = 0, exprTimer = 0, exprIdx = null, stopped = false, lastSrc = "";
    const shadowEl = ui.root.querySelector(".tml-npc__shadow");
    // ---- Lớp chuyển động mượt (tính bằng code, không cần thêm ảnh) ----
    // phase: pha bước chân (chu kỳ), tính theo QUÃNG ĐƯỜNG đã đi nên chân khớp với tốc độ thực tế (không trượt, không "chạy tại chỗ")
    const CYCLE = { walk: 46, run: 88 };       // độ dài một chu kỳ bước (px của sprite, chưa nhân tỉ lệ)
    const BOB = { walk: 2.4, run: 4.2 };       // độ nảy theo nhịp bước (px sprite)
    const LEAN = { walk: 2.2, run: 6 };        // độ nghiêng người khi di chuyển (độ)
    let phase = 0, rafId = 0, lastT = 0, lastPos = null, vx = 0, vy = 0, speed = 0, leanDeg = 0, wasMoving = false;
    let sq = 0, sqv = 0;                       // lò xo nén/giãn (squash & stretch)
    let idleT = Math.random() * 6;
    const smoothOn = () => cfg.animation.smooth !== false && !core.reduced();
    const kick = v => { sqv += v; };
    function motionTick(t) {
      rafId = 0;
      if (stopped || core.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (t - (lastT || t)) / 1000)); lastT = t;
      const p = core.pos;
      if (lastPos) {
        const ivx = (p.x - lastPos.x) / dt, ivy = (p.y - lastPos.y) / dt, k = 1 - Math.exp(-dt * 14);
        vx += (ivx - vx) * k; vy += (ivy - vy) * k;
      }
      lastPos = { x: p.x, y: p.y };
      speed = Math.hypot(vx, vy);
      const sc = core.scale || 1, moving = (state === "walk" || state === "run") && speed > 4;
      if (moving && !wasMoving) kick(state === "run" ? 12 : 7);      // vừa xuất phát: người hơi giãn ra
      if (!moving && wasMoving) kick(-10);                              // vừa dừng: hơi nhún xuống
      wasMoving = moving;
      let bob = 0, tilt = 0, sx = 1, sy = 1;
      if ((state === "walk" || state === "run") && exprIdx == null) {
        if (moving) {
          phase += (speed * dt) / ((CYCLE[state] || 46) * sc);
          const l = frames();
          if (l.length > 1) {
            const f = Math.floor((phase % 1) * l.length) % l.length;
            if (f !== frame) { frame = f; paint(); }
          }
          bob = -Math.abs(Math.sin(phase * Math.PI * 2)) * (BOB[state] || 2);
          const lead = Math.max(-1, Math.min(1, vx / (state === "run" ? 150 : 60)));
          const base = dir === "up" || dir === "down" ? 0.35 : 1;
          tilt = lead * (LEAN[state] || 2) * base;
        }
      } else if (state === "idle" && exprIdx == null) {
        idleT += dt;
        if (cfg.animation.breathing !== false) {
          const b = Math.sin(idleT * 2.1);
          sy += b * 0.011; sx -= b * 0.006; bob = b * -0.5;
        }
      }
      leanDeg += (tilt - leanDeg) * (1 - Math.exp(-dt * 10));
      // lò xo squash: s'' = -k·s - c·s'
      sqv += (-190 * sq - 17 * sqv) * dt; sq += sqv * dt;
      const sqq = Math.max(-0.1, Math.min(0.1, sq / 14));
      sy *= 1 - sqq; sx *= 1 + sqq * 0.7;
      sprite.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${leanDeg.toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      if (shadowEl) {
        const lift = Math.min(1, -bob / 4.2);
        shadowEl.style.transform = `scale(${(1 - lift * 0.14).toFixed(3)})`;
        shadowEl.style.opacity = (1 - lift * 0.25).toFixed(2);
      }
      schedule();
    }
    function schedule() { if (!rafId && !stopped && smoothOn()) rafId = requestAnimationFrame(motionTick); }
    function cancelMotion() {
      if (rafId) cancelAnimationFrame(rafId); rafId = 0; lastT = 0; lastPos = null; vx = vy = speed = 0; leanDeg = 0; sq = sqv = 0; wasMoving = false;
      sprite.style.transform = ""; if (shadowEl) { shadowEl.style.transform = ""; shadowEl.style.opacity = ""; }
    }

    const frames = () => {
      const e = manifest.states[state];
      if (!e) return [];
      return e.frames || e[dir] || e.down || [];
    };
    function paint() {
      let path;
      if (exprIdx != null) path = (manifest.states.interact.frames || [])[exprIdx];
      else { const l = frames(); if (!l.length) return; path = l[frame % l.length]; }
      if (!path) return;
      const u = core.assetUrl(path);
      if (u !== lastSrc) { lastSrc = u; sprite.src = u; }
      ui.root.dataset.state = state;
      ui.root.dataset.dir = dir;
    }
    function restart() {
      clearInterval(timer); timer = 0;
      const l = frames();
      if (stopped || exprIdx != null || l.length < 2 || core.reduced()) return;
      if (smoothOn() && (state === "walk" || state === "run")) { schedule(); return; }   // khung hình do pha bước chân điều khiển
      if (smoothOn()) schedule();
      const base = INTERVALS[state] || 200;
      timer = setInterval(() => { frame = (frame + 1) % l.length; paint(); }, base / (cfg.animation.speed || 1));
    }
    function play(nextState, nextDir) {
      if (!manifest.states[nextState]) return false;
      const d = DIRS.includes(nextDir) ? nextDir : dir;
      if (nextState === state && d === dir) {
        if (exprIdx != null) { clearTimeout(exprTimer); exprIdx = null; paint(); restart(); }
        return true;
      }
      clearTimeout(exprTimer); exprIdx = null;
      const turned = d !== dir && nextState === state;
      state = nextState; dir = d;
      frame = (state === "walk" || state === "run") && smoothOn() ? Math.floor((phase % 1) * (frames().length || 1)) : 0;
      if (turned && smoothOn()) kick(state === "run" ? 7 : 4);        // đổi hướng: nhún nhẹ cho tự nhiên
      paint(); restart();
      return true;
    }
    function expression(name, ms = 1200) {
      const idx = EXPR[name];
      if (idx == null || !manifest.states.interact) return;
      clearTimeout(exprTimer);
      exprIdx = idx;
      paint(); restart();
      exprTimer = setTimeout(() => { exprIdx = null; paint(); restart(); }, ms);
    }
    function stop() { stopped = true; clearInterval(timer); timer = 0; clearTimeout(exprTimer); exprIdx = null; cancelMotion(); }
    function resume() { stopped = false; paint(); restart(); schedule(); }
    function preload() {
      const all = [];
      Object.values(manifest.states).forEach(e => {
        if (e.frames) all.push(...e.frames);
        else Object.values(e).forEach(v => Array.isArray(v) && all.push(...v));
      });
      const jobs = all.map(p => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = core.assetUrl(p); }));
      return Promise.race([Promise.all(jobs), new Promise(res => setTimeout(res, 5000))]);
    }

    return {
      play,
      idle: d => play("idle", d),
      walk: d => play("walk", d),
      run: d => play("run", d),
      face: d => play("idle", d),
      expression, stop, resume, preload, paint, kick,
      get state() { return state; },
      get direction() { return dir; },
      DIRS
    };
  };
})();

/* ===== 30-collision.js ===== */
/* NPC TÍNH MÍ LON — NPC Collision: thu thập vật cản, kiểm tra va chạm, tính vùng được phép */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;

  NS.M.Collision = function Collision(core) {
    const cc = core.cfg.collision;
    let cache = null, cacheAt = 0, dirty = true;
    const api = { version: 0 };

    /** Hitbox của NPC so với góc trên-trái của sprite. */
    function hitbox() {
      const { w, h } = core.size();
      const ix = w * cc.inset.x;
      if (cc.mode === "feet") { const fh = h * cc.feetHeight; return { ox: ix, oy: h - fh, w: w - 2 * ix, h: fh }; }
      const iy = h * cc.inset.y;
      return { ox: ix, oy: iy, w: w - 2 * ix, h: h - 2 * iy };
    }
    function hitRectAt(x, y) {
      const b = hitbox();
      return U.mkRect(x + b.ox, y + b.oy, x + b.ox + b.w, y + b.oy + b.h);
    }

    function collect() {
      const vw = U.viewW(), vh = U.viewH();
      const maxArea = cc.maxObstacleViewportRatio * vw * vh;
      const seen = new Set();
      const out = [];
      const add = (sel, kind) => {
        if (!sel) return;
        let list;
        try { list = document.querySelectorAll(sel); } catch (e) { return; }
        for (const el of list) {
          if (seen.has(el) || el === document.body || el === document.documentElement) continue;
          seen.add(el);
          if (cc.ignoreSelector && el.closest(cc.ignoreSelector)) continue;
          if (!el.getClientRects().length) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          if (r.right < -60 || r.left > vw + 60 || r.bottom < -60 || r.top > vh + 60) continue;
          if (r.width * r.height > maxArea) continue;
          const s = getComputedStyle(el);
          if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) continue;
          out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, el, kind });
        }
      };
      add(cc.avoidSelector, "interactive");
      add(cc.extraAvoid, "interactive");
      add(cc.contentSelector, "content");
      add(cc.extraContent, "content");
      // các phần tử trường dữ liệu đã khai báo (kể cả widget tùy biến) luôn được tránh
      if (core.adapter) for (const el of core.adapter.allElements()) {
        if (seen.has(el) || !U.isShown(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, el, kind: "interactive" });
      }
      if (core.ui.toggle && !core.ui.toggle.hidden) {
        const r = core.ui.toggle.getBoundingClientRect();
        if (r.width) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, el: core.ui.toggle, kind: "ui" });
      }
      for (const ex of cc.extraRects || []) {
        const r = typeof ex === "function" ? ex() : ex;
        if (r) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, el: null, kind: "extra" });
      }
      return out;
    }

    function obstacles() {
      const now = performance.now();
      if (!cache || dirty || now - cacheAt > 250) { cache = collect(); cacheAt = now; dirty = false; }
      return cache;
    }
    function markDirty() { dirty = true; api.version++; }

    /** NPC đặt tại (x,y) có đè lên vật cản không? opts.ignore(o) để bỏ qua; opts.kinds giới hạn loại */
    function isFree(x, y, opts = {}) {
      const hit = hitRectAt(x, y);
      const pad = opts.padding != null ? opts.padding : cc.padding;
      for (const o of obstacles()) {
        if (opts.ignore && opts.ignore(o)) continue;
        if (opts.kinds && !opts.kinds.includes(o.kind)) continue;
        if (hit.left < o.right + pad && hit.right > o.left - pad && hit.top < o.bottom + pad && hit.bottom > o.top - pad) return false;
      }
      return true;
    }
    /** Diện tích chồng lấn (không padding) với vật cản đã lọc. */
    function overlapScore(x, y, opts = {}) {
      const hit = hitRectAt(x, y);
      let interactive = 0, content = 0;
      for (const o of obstacles()) {
        if (opts.ignore && opts.ignore(o)) continue;
        const a = U.overlapArea(hit, o);
        if (!a) continue;
        if (o.kind === "content") content += a; else interactive += a;
      }
      return { interactive, content };
    }

    function toPosBounds(a) {
      const { w, h } = core.size();
      let minX = a.left, maxX = a.right - w, minY = a.top, maxY = a.bottom - h;
      if (maxX < minX) minX = maxX = (a.left + a.right - w) / 2;
      if (maxY < minY) minY = maxY = (a.top + a.bottom - h) / 2;
      return { minX, maxX, minY, maxY };
    }
    /** Vùng hiển thị (dùng cho hướng dẫn: ưu tiên hơn đi dạo). Trả về giới hạn cho góc trên-trái. */
    function viewBounds() {
      const p = core.cfg.guidance.viewPadding;
      return toPosBounds(U.mkRect(p, p, U.viewW() - p, U.viewH() - p));
    }
    /** Vùng đi dạo: khu vực cấu hình ∩ vùng nhìn thấy. */
    function roamBounds() {
      const a = core.cfg.roaming.area;
      const { w, h } = core.size();
      let r = U.mkRect(0, 0, U.viewW(), U.viewH());
      if (a.selector) {
        let el = null;
        try { el = document.querySelector(a.selector); } catch (e) { /* selector sai */ }
        if (el && U.isShown(el)) {
          const b = el.getBoundingClientRect(), e = a.expand || {};
          const ex = U.mkRect(
            Math.max(0, b.left - (e.left || 0)), Math.max(0, b.top - (e.top || 0)),
            Math.min(U.viewW(), b.right + (e.right || 0)), Math.min(U.viewH(), b.bottom + (e.bottom || 0)));
          if (ex.width > w * 0.6 && ex.height > h * 0.6) r = ex;
        }
      }
      const p = a.padding || 0;
      return toPosBounds(U.mkRect(r.left + p, r.top + p, r.right - p, r.bottom - p));
    }
    const clampTo = (pos, b) => ({ x: U.clamp(pos.x, b.minX, b.maxX), y: U.clamp(pos.y, b.minY, b.maxY) });

    Object.assign(api, { hitbox, hitRectAt, obstacles, markDirty, isFree, overlapScore, viewBounds, roamBounds, clampTo });
    return api;
  };
})();

/* ===== 40-positioning.js ===== */
/* NPC TÍNH MÍ LON — NPC Positioning: chọn chỗ đứng cạnh trường dữ liệu và chỗ đặt bong bóng */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;

  NS.M.Positioning = function Positioning(core) {
    const gc = core.cfg.guidance;
    const SHIFTS = [0, -24, 24, -48, 48, -80, 80, -112, 112];
    const FACE = { right: "left", left: "right", top: "down", bottom: "up" };

    function targetFilter(el) {
      return o => !!el && o.el && (o.el === el || el.contains(o.el) || o.el.contains(el));
    }

    function candidates(tr, sides, gap) {
      const { w, h } = core.size();
      const out = [];
      sides.forEach((side, si) => {
        for (const sh of SHIFTS) {
          let x, y;
          if (side === "right") { x = tr.right + gap; y = (tr.top + tr.bottom) / 2 - h * 0.5 + sh; }
          else if (side === "left") { x = tr.left - gap - w; y = (tr.top + tr.bottom) / 2 - h * 0.5 + sh; }
          else if (side === "bottom") { x = (tr.left + tr.right) / 2 - w / 2 + sh; y = tr.bottom + gap; }
          else { x = (tr.left + tr.right) / 2 - w / 2 + sh; y = tr.top - gap - h; }
          out.push({ x, y, side, si, shift: Math.abs(sh) });
        }
      });
      return out;
    }

    /**
     * Chọn chỗ đứng cạnh phần tử đích. Thử lần lượt 4 cấp:
     * 1) không đè lên bất kỳ vật cản nào; 2) chỉ đè nhãn/tiêu đề (không bao giờ đè ô nhập/nút); 3) đậu ở góc màn hình trống nhất (mũi tên chỉ từ xa).
     */
    function computeStand(tr, opts = {}) {
      const { w, h } = core.size();
      const b = core.collision.viewBounds();
      const sides = opts.sides || gc.preferredSides;
      const gap = opts.gap != null ? opts.gap : gc.standGap;
      const ignore = targetFilter(opts.el);
      const cur = core.pos;
      const targetRectPad = U.expand(tr, 8);
      const all = candidates(tr, sides, gap)
        .map(c => ({ ...c, ok: c.x >= b.minX - 1 && c.x <= b.maxX + 1 && c.y >= b.minY - 1 && c.y <= b.maxY + 1 }))
        .filter(c => c.ok)
        .map(c => ({ ...c, x: U.clamp(c.x, b.minX, b.maxX), y: U.clamp(c.y, b.minY, b.maxY) }))
        .filter(c => !U.overlaps(core.collision.hitRectAt(c.x, c.y), targetRectPad));
      for (const c of all) {
        c.ov = core.collision.overlapScore(c.x, c.y, { ignore });
        c.base = c.si * 60 + c.shift * 0.6 + Math.hypot(c.x - cur.x, c.y - cur.y) * 0.03;
        c.free = core.collision.isFree(c.x, c.y, { ignore, padding: Math.min(6, core.cfg.collision.padding) });
      }
      const pick = list => list.sort((a, b2) => a.base - b2.base)[0];
      let c = pick(all.filter(x => x.free && x.ov.interactive === 0 && x.ov.content === 0));
      let stage = 1;
      if (!c) { const l2 = all.filter(x => x.ov.interactive === 0); l2.forEach(x => { x.base += x.ov.content * 0.02; }); c = pick(l2); stage = 2; } // chật chỗ: ưu tiên chỗ che ít nội dung nhất
      if (c) return { x: c.x, y: c.y, side: c.side, face: FACE[c.side], stage, docked: false };
      return dock(tr, b, ignore);
    }

    function dock(tr, b, ignore) {
      const corners = [
        { x: b.maxX, y: b.maxY, name: "br" }, { x: b.minX, y: b.maxY, name: "bl" },
        { x: b.maxX, y: b.minY, name: "tr" }, { x: b.minX, y: b.minY, name: "tl" }
      ];
      const cx = (tr.left + tr.right) / 2, cy = (tr.top + tr.bottom) / 2;
      const { w, h } = core.size();
      corners.forEach(c => {
        c.free = core.collision.isFree(c.x, c.y, { ignore });
        c.d = Math.hypot(c.x + w / 2 - cx, c.y + h / 2 - cy);
        c.hit = U.overlaps(core.collision.hitRectAt(c.x, c.y), tr);
      });
      const best = corners.filter(c => !c.hit).sort((a, z) => (z.free - a.free) || (a.d - z.d))[0] || corners[0];
      const dx = cx - (best.x + w / 2), dy = cy - (best.y + h / 2);
      const face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      return { x: best.x, y: best.y, side: null, face, stage: 4, docked: true };
    }

    /** Chọn vị trí bong bóng quanh NPC sao cho không che trường đích và các vật cản quan trọng. */
    function computeBubble(npcRect, size, targetRect, prevPlacement) {
      const vw = U.viewW(), vh = U.viewH(), m = 8, gap = 10;
      const { w: bw, h: bh } = size;
      const cx = (npcRect.left + npcRect.right) / 2;
      const cands = [];
      [0, -1, 1, -2, 2].forEach((k, n) => {       // trượt ngang để né nội dung phía trên/dưới
        const x = cx - bw / 2 + k * bw * 0.28;
        cands.push({ place: "top", x, y: npcRect.top - bh - gap, slide: n });
        cands.push({ place: "bottom", x, y: npcRect.bottom + gap, slide: n });
      });
      cands.push({ place: "left", x: npcRect.left - bw - gap, y: npcRect.top + 6 });
      cands.push({ place: "right", x: npcRect.right + gap, y: npcRect.top + 6 });
      cands.push({ place: "top", x: cx - bw / 2, y: npcRect.top + 4, inside: true }); // chót: đè lên đầu NPC
      const ignore = o => o.kind === "ui";
      let best = null;
      cands.forEach((c, i) => {
        const x = U.clamp(c.x, m, Math.max(m, vw - bw - m));
        const y = U.clamp(c.y, m, Math.max(m, vh - bh - m));
        const rect = U.mkRect(x, y, x + bw, y + bh);
        let score = (c.inside ? 200 : 0) + (c.place === "bottom" ? 25 : 0) + (c.place === "left" || c.place === "right" ? 15 : 0) + (c.slide || 0) * 6;
        if (Math.abs(x - c.x) > 1 || Math.abs(y - c.y) > 1) score += 40 + Math.abs(x - c.x) * 0.3 + Math.abs(y - c.y) * 0.3;
        if (targetRect) score += U.overlapArea(rect, U.expand(targetRect, 6)) * 0.5;
        if (U.overlapArea(rect, npcRect) > 0 && !c.inside) score += 400;
        for (const o of core.collision.obstacles()) {
          if (ignore(o)) continue;
          const a = U.overlapArea(rect, o);
          if (a) score += a * (o.kind === "content" ? 0.08 : 0.3);
        }
        if (prevPlacement && prevPlacement === c.place) score -= 25;
        if (!best || score < best.score) best = { ...c, x, y, score, rect };
      });
      // vị trí đuôi bong bóng (chỉ về phía NPC)
      const tail = { side: { top: "bottom", bottom: "top", left: "right", right: "left" }[best.place] };
      if (tail.side === "bottom" || tail.side === "top") tail.offset = U.clamp(cx - best.x, 18, bw - 18);
      else tail.offset = U.clamp(npcRect.top + (npcRect.bottom - npcRect.top) * 0.3 - best.y, 16, bh - 16);
      return { x: best.x, y: best.y, place: best.place, tail };
    }

    return { computeStand, computeBubble };
  };
})();

/* ===== 50-movement.js ===== */
/* NPC TÍNH MÍ LON — NPC Movement: tìm đường (A*), di chuyển mượt, và Auto Roaming */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const ACC = 520, DEC = 640; // px/s²

  NS.M.Movement = function Movement(core) {
    const cfg = core.cfg, cc = cfg.collision, rc = cfg.roaming;
    let job = null, rafId = 0, last = 0;
    let facing = "down";

    const boundsOf = name => (name === "roam" ? core.collision.roamBounds() : core.collision.viewBounds());

    /* ---------------- A* trên lưới ---------------- */
    function heapPush(h, k, v) {
      h.k.push(k); h.v.push(v);
      let i = h.k.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (h.k[p] <= h.k[i]) break;
        [h.k[p], h.k[i]] = [h.k[i], h.k[p]]; [h.v[p], h.v[i]] = [h.v[i], h.v[p]]; i = p;
      }
    }
    function heapPop(h) {
      const top = h.v[0], lk = h.k.pop(), lv = h.v.pop();
      if (h.k.length) {
        h.k[0] = lk; h.v[0] = lv;
        let i = 0;
        for (;;) {
          let l = 2 * i + 1, r = l + 1, m = i;
          if (l < h.k.length && h.k[l] < h.k[m]) m = l;
          if (r < h.k.length && h.k[r] < h.k[m]) m = r;
          if (m === i) break;
          [h.k[m], h.k[i]] = [h.k[i], h.k[m]]; [h.v[m], h.v[i]] = [h.v[i], h.v[m]]; i = m;
        }
      }
      return top;
    }

    function buildGrid(b, ignore) {
      let cs = cc.gridCell;
      while (((b.maxX - b.minX) / cs + 1) * ((b.maxY - b.minY) / cs + 1) > 90000) cs *= 1.5;
      const cols = Math.max(1, Math.floor((b.maxX - b.minX) / cs) + 1);
      const rows = Math.max(1, Math.floor((b.maxY - b.minY) / cs) + 1);
      const blocked = new Uint8Array(cols * rows);
      const hb = core.collision.hitbox(), pad = cc.padding;
      for (const o of core.collision.obstacles()) {
        if (ignore && ignore(o)) continue;
        const lox = o.left - pad - hb.w - hb.ox, hix = o.right + pad - hb.ox;
        const loy = o.top - pad - hb.h - hb.oy, hiy = o.bottom + pad - hb.oy;
        const i0 = Math.max(0, Math.floor((lox - b.minX) / cs) + 1), i1 = Math.min(cols - 1, Math.ceil((hix - b.minX) / cs) - 1);
        const j0 = Math.max(0, Math.floor((loy - b.minY) / cs) + 1), j1 = Math.min(rows - 1, Math.ceil((hiy - b.minY) / cs) - 1);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) blocked[j * cols + i] = 1;
      }
      return { cs, cols, rows, blocked, b };
    }
    const cellOf = (g, p) => ({
      i: U.clamp(Math.round((p.x - g.b.minX) / g.cs), 0, g.cols - 1),
      j: U.clamp(Math.round((p.y - g.b.minY) / g.cs), 0, g.rows - 1)
    });
    const pointOf = (g, i, j) => ({ x: g.b.minX + i * g.cs, y: g.b.minY + j * g.cs });

    function nearestFree(g, c, maxR = 60) {
      if (!g.blocked[c.j * g.cols + c.i]) return c;
      for (let r = 1; r <= maxR; r++) {
        let best = null, bd = Infinity;
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = c.i + di, j = c.j + dj;
          if (i < 0 || j < 0 || i >= g.cols || j >= g.rows || g.blocked[j * g.cols + i]) continue;
          const d = di * di + dj * dj;
          if (d < bd) { bd = d; best = { i, j }; }
        }
        if (best) return best;
      }
      return null;
    }

    function astar(g, s, t) {
      const n = g.cols * g.rows;
      const gs = new Float32Array(n).fill(Infinity), parent = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
      const heap = { k: [], v: [] };
      const idx = (i, j) => j * g.cols + i;
      const hh = (i, j) => { const dx = Math.abs(i - t.i), dy = Math.abs(j - t.j); return dx + dy - 0.5858 * Math.min(dx, dy); };
      gs[idx(s.i, s.j)] = 0; heapPush(heap, hh(s.i, s.j), idx(s.i, s.j));
      const goal = idx(t.i, t.j);
      const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
      while (heap.k.length) {
        const cur = heapPop(heap);
        if (closed[cur]) continue;
        closed[cur] = 1;
        if (cur === goal) break;
        const ci = cur % g.cols, cj = (cur / g.cols) | 0;
        for (const [di, dj, cost] of D) {
          const ni = ci + di, nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= g.cols || nj >= g.rows) continue;
          const ni_ = idx(ni, nj);
          if (g.blocked[ni_] || closed[ni_]) continue;
          if (di && dj && (g.blocked[idx(ci + di, cj)] || g.blocked[idx(ci, cj + dj)])) continue; // không cắt góc
          const ng = gs[cur] + cost;
          if (ng < gs[ni_]) { gs[ni_] = ng; parent[ni_] = cur; heapPush(heap, ng + hh(ni, nj), ni_); }
        }
      }
      if (!closed[goal]) return null;
      const cells = [];
      for (let c = goal; c !== -1; c = parent[c]) cells.push({ i: c % g.cols, j: (c / g.cols) | 0 });
      return cells.reverse();
    }

    function segClear(a, b, ignore, bounds) {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(d / (cc.gridCell * 0.5)));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (x < bounds.minX - 0.5 || x > bounds.maxX + 0.5 || y < bounds.minY - 0.5 || y > bounds.maxY + 0.5) return false;
        if (!core.collision.isFree(x, y, { ignore })) return false;
      }
      return true;
    }

    /** Lập đường đi từ from tới to. Trả về mảng điểm (px) hoặc null nếu không có đường. */
    function plan(from, to, opts = {}) {
      const b = opts.bounds || core.collision.viewBounds();
      const ignore = opts.ignore;
      const dest = core.collision.clampTo(to, b);
      if (opts.direct) return [{ x: from.x, y: from.y }, dest];
      const g = buildGrid(b, ignore);
      const sc0 = cellOf(g, from), gc0 = cellOf(g, dest);
      const sc = nearestFree(g, sc0), gc = nearestFree(g, gc0);
      if (!sc || !gc) return null;
      const cells = astar(g, sc, gc);
      if (!cells) return null;
      const pts = [{ x: from.x, y: from.y }];
      const startBlocked = g.blocked[sc0.j * g.cols + sc0.i] || (sc.i !== sc0.i || sc.j !== sc0.j);
      cells.forEach(c => pts.push(pointOf(g, c.i, c.j)));
      // điểm cuối: dùng đúng điểm đích nếu nó trống, nếu không dùng ô trống gần nhất
      const goalExact = core.collision.isFree(dest.x, dest.y, { ignore }) && gc.i === gc0.i && gc.j === gc0.j;
      if (goalExact) pts.push(dest);
      // làm mượt đường đi bằng kiểm tra tầm nhìn thẳng
      const keepFrom = startBlocked ? 2 : 1; // nếu đang đè vật cản, giữ đoạn thoát ra
      const out = pts.slice(0, Math.min(keepFrom, pts.length));
      let anchor = out[out.length - 1], i = out.length;
      while (i < pts.length) {
        let j = pts.length - 1;
        while (j > i && !segClear(anchor, pts[j], ignore, b)) j--;
        out.push(pts[j]); anchor = pts[j]; i = j + 1;
      }
      // bỏ điểm trùng
      return out.filter((p, k) => k === 0 || Math.hypot(p.x - out[k - 1].x, p.y - out[k - 1].y) > 0.5);
    }

    /* ---------------- thực thi di chuyển ---------------- */
    function facingFor(dx, dy, prev) {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (prev === "left" || prev === "right") { if (ax >= ay * 0.6) return dx < 0 ? "left" : "right"; return dy < 0 ? "up" : "down"; }
      if (ay >= ax * 0.6) return dy < 0 ? "up" : "down";
      return dx < 0 ? "left" : "right";
    }

    function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
    function finish(result) {
      const j = job; job = null; stopLoop();
      core.animation.idle(j && j.faceAtEnd ? j.faceAtEnd : facing);
      if (j) { facing = core.animation.direction; j.resolve(result); }
    }
    function cancel(reason = "cancelled") {
      if (!job) return;
      const j = job; job = null; stopLoop();
      core.animation.idle(facing);
      j.resolve(reason);
    }

    function moveTo(dest, opts = {}) {
      if (job) cancel("replaced");
      return new Promise(resolve => {
        if (core.destroyed) return resolve("cancelled");
        const bounds = typeof opts.bounds === "object" && opts.bounds ? opts.bounds : boundsOf(opts.bounds || "view");
        const from = { x: core.pos.x, y: core.pos.y };
        const target = core.collision.clampTo(dest, bounds);
        if (core.reduced() && !opts.animateAlways) { core.place(target.x, target.y); core.animation.idle(opts.face || facing); return resolve("arrived"); }
        let path = opts.path || plan(from, target, { bounds, ignore: opts.ignore, direct: opts.direct });
        if (path && opts.maxDetour) {   // đường vòng quá dài: băng thẳng qua (chỉ khi đang đi hướng dẫn, đi nhanh)
          let len = 0; for (let k = 1; k < path.length; k++) len += Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y);
          const straight = Math.hypot(target.x - from.x, target.y - from.y);
          if (len > straight * opts.maxDetour + 150) { path = [from, target]; opts = Object.assign({}, opts, { direct: true }); }
        }
        if (!path && opts.force) path = [from, target];
        if (!path) return resolve("blocked");
        if (path.length < 2) { core.animation.idle(opts.face || facing); return resolve("arrived"); }
        job = {
          path, idx: 1, v: 0, resolve, bounds,
          speed: opts.speed || (opts.run ? rc.runSpeed : rc.speed),
          run: !!opts.run, opts, dest: target, replans: 0, ver: core.collision.version,
          lastCheck: 0, faceAtEnd: opts.face || null, seg: null
        };
        last = performance.now();
        rafId = requestAnimationFrame(tick);
      });
    }

    function pathRemaining(j) {
      let rem = Math.hypot(j.path[j.idx].x - core.pos.x, j.path[j.idx].y - core.pos.y);
      for (let k = j.idx; k < j.path.length - 1; k++) rem += Math.hypot(j.path[k + 1].x - j.path[k].x, j.path[k + 1].y - j.path[k].y);
      return rem;
    }

    function tick(now) {
      rafId = 0;
      const j = job;
      if (!j || core.destroyed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      // kiểm tra lại vật cản khi bố cục thay đổi
      if (!j.opts.direct && !j.opts.force && now - j.lastCheck > 160) {
        j.lastCheck = now;
        if (j.ver !== core.collision.version) {
          j.ver = core.collision.version;
          if (!pathAheadClear(j)) {
            const np = j.replans++ < 3 ? plan(core.pos, j.dest, { bounds: j.bounds, ignore: j.opts.ignore }) : null;
            if (!np) return finish("blocked");
            j.path = np; j.idx = 1;
          }
        }
      }
      const rem = pathRemaining(j);
      j.v = Math.min(j.speed, j.v + ACC * dt);
      const v = Math.min(j.v, Math.sqrt(2 * DEC * rem) + 10);
      let step = v * dt;
      while (step > 0 && j.idx < j.path.length) {
        const tp = j.path[j.idx];
        const dx = tp.x - core.pos.x, dy = tp.y - core.pos.y, d = Math.hypot(dx, dy);
        if (d > 0.01) {
          const f = facingFor(dx, dy, facing);
          if (f !== facing || core.animation.state !== (j.run ? "run" : "walk")) {
            facing = f;
            j.run ? core.animation.run(f) : core.animation.walk(f);
          }
        }
        if (d <= step) { core.place(tp.x, tp.y); step -= d; j.idx++; }
        else { core.place(core.pos.x + dx / d * step, core.pos.y + dy / d * step); step = 0; }
      }
      if (j.idx >= j.path.length) return finish("arrived");
      rafId = requestAnimationFrame(tick);
    }

    function pathAheadClear(j) {
      let from = { x: core.pos.x, y: core.pos.y }, left = 90;
      for (let k = j.idx; k < j.path.length && left > 0; k++) {
        const to = j.path[k], d = Math.hypot(to.x - from.x, to.y - from.y);
        const t = d > left ? left / d : 1;
        const end = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        const ok = segClear(from, end, j.opts.ignore, j.bounds);
        // đang đè vật cản sẵn (vd. cuộn trang): chỉ cần có đường thoát, để plan() xử lý
        if (!ok) return core.collision.isFree(core.pos.x, core.pos.y, { ignore: j.opts.ignore }) ? false : true;
        left -= d * t; from = to;
        if (t < 1) break;
      }
      return true;
    }

    function face(dir) { facing = dir; core.animation.face(dir); }

    /** Nếu NPC đang đè lên vật cản hoặc ra ngoài màn hình (cuộn trang, đổi cỡ cửa sổ...), nhẹ nhàng đi tới chỗ trống gần nhất. */
    function settle(boundsName = "view") {
      if (job) return Promise.resolve("busy");
      const b = boundsOf(boundsName);
      const inside = core.pos.x >= b.minX - 1 && core.pos.x <= b.maxX + 1 && core.pos.y >= b.minY - 1 && core.pos.y <= b.maxY + 1;
      if (inside && core.collision.isFree(core.pos.x, core.pos.y)) return Promise.resolve("ok");
      const g = buildGrid(b);
      const c = nearestFree(g, cellOf(g, core.pos), 120);
      const dest = c ? pointOf(g, c.i, c.j) : core.collision.clampTo(core.pos, b);
      if (Math.hypot(dest.x - core.pos.x, dest.y - core.pos.y) < 1) return Promise.resolve("ok");
      return moveTo(dest, { bounds: b, run: true, direct: true, face: facing });
    }

    /** Legacy: bước một đoạn theo hướng (dùng cho nút điều khiển thử / phím mũi tên). */
    function step(dir, distance = rc.speed) {
      const d = { left: [-distance, 0], right: [distance, 0], up: [0, -distance], down: [0, distance] }[dir];
      if (!d) return Promise.resolve("blocked");
      face(dir);
      return moveTo({ x: core.pos.x + d[0], y: core.pos.y + d[1] }, { bounds: "view", face: dir });
    }

    /* ---------------- Auto Roaming ---------------- */
    const roam = { active: false, timers: [], moving: false, reasons: new Set() };
    const clearTimers = () => { roam.timers.forEach(clearTimeout); roam.timers = []; };
    const later = (fn, ms) => { const t = setTimeout(fn, ms); roam.timers.push(t); return t; };
    const ready = () => roam.active && roam.reasons.size === 0 && !core.destroyed && core.state.enabled && !document.hidden && !core.suspended();

    function restRange() { return Array.isArray(rc.restMs) ? rc.restMs : [rc.restMs, rc.restMs + 1500]; }
    function rest(first) {
      clearTimers();
      if (!ready()) return;
      core.animation.idle(facing);
      const [a, z] = restRange();
      const ms = first ? U.rand(400, 1200) : U.rand(a, z);
      if (Math.random() < rc.turnChance) {
        later(() => {
          if (!ready() || roam.moving) return;
          const others = core.animation.DIRS.filter(d => d !== facing);
          face(U.pick(others));
        }, ms * U.rand(0.3, 0.6));
      }
      later(go, ms);
    }

    function pickDestination() {
      const b = core.collision.roamBounds();
      const [dmin, dmax] = Array.isArray(rc.distance) ? rc.distance : [rc.distance, rc.distance * 2];
      for (let t = 0; t < 14; t++) {
        const ang = U.rand(0, Math.PI * 2), dist = U.rand(dmin, dmax);
        const cand = core.collision.clampTo({ x: core.pos.x + Math.cos(ang) * dist, y: core.pos.y + Math.sin(ang) * dist }, b);
        if (Math.hypot(cand.x - core.pos.x, cand.y - core.pos.y) < 40) continue;
        if (!core.collision.isFree(cand.x, cand.y)) continue;
        const path = plan(core.pos, cand, { bounds: b });
        if (path && path.length > 1) return { cand, path, bounds: b };
      }
      return null;
    }

    function go() {
      if (!ready()) return;
      const pick = pickDestination();
      if (!pick) return rest(false);
      roam.moving = true;
      const run = Math.random() < rc.runChance;
      moveTo(pick.cand, { path: pick.path, bounds: pick.bounds, run, roam: true }).then(res => {
        roam.moving = false;
        if (res === "arrived" || res === "blocked") rest(false);
      });
    }

    const roamApi = {
      start() {
        if (core.reduced()) { core.bus.emit("roaming:blocked", "reduced-motion"); return false; }
        roam.active = true; rest(true); core.bus.emit("roaming", true); return true;
      },
      stop() {
        roam.active = false; clearTimers();
        if (roam.moving) { roam.moving = false; cancel("roam-stop"); }
        core.bus.emit("roaming", false);
      },
      pause(reason = "api") {
        roam.reasons.add(reason); clearTimers();
        if (roam.moving) { roam.moving = false; cancel("roam-pause"); }
      },
      resume(reason = "api", delay = 800) {
        roam.reasons.delete(reason);
        if (roam.active && roam.reasons.size === 0) { clearTimers(); later(() => rest(true), delay); }
      },
      get active() { return roam.active; },
      get paused() { return roam.reasons.size > 0; },
      reasons: () => [...roam.reasons]
    };

    return { moveTo, cancel, plan, settle, step, face, roam: roamApi, get facing() { return facing; }, get busy() { return !!job; } };
  };
})();

/* ===== 60-pointer.js ===== */
/* NPC TÍNH MÍ LON — NPC Pointer: mũi tên chỉ tay và khung sáng quanh trường đang được giải thích */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const ARROW_W = 56, ARROW_H = 28;

  NS.M.Pointer = function Pointer(core) {
    const { ui, cfg } = core;
    let target = null, shown = false, arrowOn = true;

    function npcRect() { return core.npcRect(); }

    function hide() {
      shown = false; target = null;
      ui.arrow.hidden = true; ui.ring.hidden = true; ui.line.hidden = true;
    }

    function update() {
      if (!shown || !target) return;
      if (!U.isShown(target)) { const t = target; hide(); core.bus.emit("target:lost", t); return; }
      const tr = U.rect(target);
      if (cfg.pointer.ring) {
        const pad = 4;
        ui.ring.hidden = false;
        ui.ring.style.transform = `translate3d(${tr.left - pad}px,${tr.top - pad}px,0)`;
        ui.ring.style.width = `${tr.width + pad * 2}px`;
        ui.ring.style.height = `${tr.height + pad * 2}px`;
        const br = parseFloat(getComputedStyle(target).borderTopLeftRadius);
        ui.ring.style.borderRadius = `${(isFinite(br) ? br : 6) + pad}px`;
      } else ui.ring.hidden = true;

      if (!arrowOn || !cfg.pointer.enabled) { ui.arrow.hidden = true; ui.line.hidden = true; return; }
      // điểm "tay" của NPC: tâm thân ở độ cao ngực
      const nr = npcRect();
      const hand = { x: (nr.left + nr.right) / 2, y: nr.top + (nr.bottom - nr.top) * 0.42 };
      const tip0 = { x: U.clamp(hand.x, tr.left, tr.right), y: U.clamp(hand.y, tr.top, tr.bottom) };
      const dx = tip0.x - hand.x, dy = tip0.y - hand.y, dist = Math.hypot(dx, dy);
      if (dist < 10) { ui.arrow.hidden = true; ui.line.hidden = true; return; }
      const ux = dx / dist, uy = dy / dist;
      // mũi tên chạm sát mép trường (cách 4px), đuôi hướng về phía NPC
      const tip = { x: tip0.x - ux * 4, y: tip0.y - uy * 4 };
      const angle = Math.atan2(uy, ux) * 180 / Math.PI;
      // NPC đứng xa (đậu ở góc màn hình): nối bằng đường chấm từ NPC tới mũi tên
      const gap = dist - 4 - ARROW_W;
      if (gap > 24) {
        const sx = hand.x, sy = hand.y;
        ui.line.hidden = false;
        ui.line.style.width = `${gap}px`;
        ui.line.style.transform = `translate3d(${sx}px,${sy}px,0) rotate(${angle}deg)`;
      } else ui.line.hidden = true;
      ui.arrow.hidden = false;
      ui.arrow.style.transform = `translate3d(${tip.x}px,${tip.y}px,0) rotate(${angle}deg) translate(${-ARROW_W}px,${-ARROW_H / 2}px)`;
    }

    function show(el, opts = {}) {
      if (!el) return;
      target = el; shown = true; arrowOn = opts.arrow !== false;
      update();
    }

    core.bus.on("move", () => { if (shown) update(); });
    core.bus.on("layout", () => { if (shown) update(); });

    return { show, hide, update, get target() { return target; }, get visible() { return shown; } };
  };
})();

/* ===== 70-dialogue.js ===== */
/* NPC TÍNH MÍ LON — NPC Dialogue: bong bóng hội thoại tiếng Việt (chỉ chữ, không âm thanh) */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const PRIORITY = { chat: 1, info: 2, success: 3, warn: 4, error: 5 };

  NS.M.Dialogue = function Dialogue(core) {
    const { ui, cfg } = core;
    const dc = cfg.dialogue;
    const bubble = ui.bubble, titleEl = ui.bubbleTitle, textEl = ui.bubbleText, closeBtn = ui.bubbleClose;
    let current = null, hideTimer = 0, idleTimer = 0, placement = null, hovering = false;
    const lastShown = new Map();

    function renderText(str) {
      textEl.textContent = "";
      // **đậm** được hỗ trợ; mọi nội dung khác là văn bản thuần (an toàn, không HTML)
      String(str).split(/(\*\*[^*]+\*\*)/g).forEach(part => {
        if (!part) return;
        if (/^\*\*[^*]+\*\*$/.test(part)) { const s = document.createElement("strong"); s.textContent = part.slice(2, -2); textEl.append(s); }
        else textEl.append(document.createTextNode(part));
      });
    }

    function hide(reason = "hide") {
      clearTimeout(hideTimer); hideTimer = 0;
      if (bubble.hidden) return;
      bubble.hidden = true; current = null; placement = null;
      core.bus.emit("dialogue:hide", reason);
    }

    function schedule(ms) {
      clearTimeout(hideTimer);
      if (current && current.sticky) return;
      hideTimer = setTimeout(() => { if (!hovering) hide("timeout"); else schedule(2500); }, ms);
    }

    function place() {
      if (bubble.hidden) return;
      const gc = core.guidance;
      const tr = gc && gc.targetRect ? gc.targetRect() : null;
      const w = bubble.offsetWidth, h = bubble.offsetHeight;
      const p = core.positioning.computeBubble(core.npcRect(), { w, h }, tr, placement);
      placement = p.place;
      bubble.style.transform = `translate3d(${Math.round(p.x)}px,${Math.round(p.y)}px,0)`;
      bubble.dataset.tail = p.tail.side;
      bubble.style.setProperty("--tml-tail", `${Math.round(p.tail.offset)}px`);
    }

    /**
     * Hiện lời thoại. msg: {text, title, type, key, priority, ms, sticky, force}
     * Trả về true nếu được hiển thị.
     */
    function show(msg) {
      if (core.destroyed || !core.state.enabled || !msg || !msg.text) return false;
      const type = msg.type || "info";
      const pr = msg.priority != null ? msg.priority : PRIORITY[type] || 2;
      if (current && !bubble.hidden && current.priority > pr && !msg.force) return false;
      const now = Date.now();
      if (msg.key && !msg.force) {
        const t = lastShown.get(msg.key);
        if (t && now - t < dc.cooldownMs) return false;
      }
      if (msg.key) lastShown.set(msg.key, now);
      current = { ...msg, type, priority: pr };
      bubble.dataset.type = type;
      bubble.style.maxWidth = `${Math.min(dc.maxWidth, U.viewW() - 24)}px`;
      titleEl.textContent = msg.title || "";
      titleEl.hidden = !msg.title;
      renderText(msg.text);
      closeBtn.hidden = !dc.closeButton;
      bubble.hidden = false;
      place();
      const ms = msg.ms != null ? msg.ms : U.clamp(dc.minMs + String(msg.text).length * dc.perCharMs, dc.minMs, dc.maxMs);
      schedule(ms);
      core.bus.emit("dialogue:show", current);
      return true;
    }

    function scheduleIdleChat() {
      clearTimeout(idleTimer);
      if (!dc.idleChat.enabled || core.destroyed || !core.state.enabled) return;
      const [a, z] = dc.idleChat.everyMs;
      idleTimer = setTimeout(() => {
        const lines = core.guide.messages.idleChat || [];
        const busy = core.guidance && core.guidance.mode !== "idle";
        if (lines.length && !busy && bubble.hidden && !document.hidden && !core.movement.busy) {
          show({ text: U.pick(lines), type: "info", priority: 1, key: "idle-chat", ms: 4200 });
        }
        scheduleIdleChat();
      }, U.rand(a, z));
    }
    function stopIdleChat() { clearTimeout(idleTimer); idleTimer = 0; }

    closeBtn.addEventListener("click", e => { e.stopPropagation(); hide("closed"); });
    bubble.addEventListener("pointerenter", () => { hovering = true; });
    bubble.addEventListener("pointerleave", () => { hovering = false; if (!bubble.hidden && current && !current.sticky) schedule(2200); });
    bubble.addEventListener("keydown", e => { if (e.key === "Escape") hide("closed"); });
    core.bus.on("move", () => { if (!bubble.hidden) place(); });
    core.bus.on("layout", () => { if (!bubble.hidden) place(); });

    return {
      show, hide, place, scheduleIdleChat, stopIdleChat,
      get visible() { return !bubble.hidden; },
      get current() { return current; },
      resetCooldowns() { lastShown.clear(); }
    };
  };
})();

/* ===== 80-adapter.js ===== */
/* NPC TÍNH MÍ LON — Website Adapter: kết nối NPC với các trường dữ liệu của website tính mí lon */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const INPUT_SEL = "input,select,textarea,[contenteditable=true]";

  NS.M.Adapter = function Adapter(core) {
    const defs = new Map();
    const elCache = new Map();
    let calcRe = null;

    const asRegex = v => (v instanceof RegExp ? v : typeof v === "string" && v ? new RegExp(v, "i") : null);

    function loadFields() {
      defs.clear(); elCache.clear();
      const fields = core.guide.fields || {};
      const order = new Map((core.guide.workflow || []).map((id, i) => [id, i]));
      Object.keys(fields).forEach(id => {
        const d = Object.assign({}, fields[id], { id });
        d.selectors = U.toArray(d.selectors);
        d.match = asRegex(d.match);
        d.order = order.has(id) ? order.get(id) : (d.order != null ? 1000 + d.order : 2000);
        d.required = d.required != null ? d.required : order.has(id);
        defs.set(id, d);
      });
      const cs = core.guide.actions && core.guide.actions.calculate;
      calcRe = cs ? asRegex(cs.matchText) : null;
    }

    function labelText(el) {
      const parts = [];
      if (el.labels) for (const l of el.labels) parts.push(l.textContent);
      ["aria-label", "placeholder", "name", "id", "title", "data-label"].forEach(a => { const v = el.getAttribute(a); if (v) parts.push(v); });
      const lb = el.getAttribute("aria-labelledby");
      if (lb) lb.split(/\s+/).forEach(i => { const n = document.getElementById(i); if (n) parts.push(n.textContent); });
      const p = el.closest("div,td,li,fieldset,p,section");
      if (p && p.querySelectorAll(INPUT_SEL).length === 1) { const l = p.querySelector("label,legend,.label"); if (l) parts.push(l.textContent); } // chỉ dùng nhãn của khung chứa khi khung đó có đúng một ô
      return parts.join(" | ");
    }

    function matchesSelector(d, el) {
      if (d.scope && !el.closest(d.scope)) return false;
      for (const s of d.selectors) {
        try { if (el.matches(s) || el.closest(s)) return true; } catch (e) { /* selector sai */ }
      }
      return false;
    }
    function matchesLabel(d, el) {
      if (d.scope && !el.closest(d.scope)) return false;
      return !!(d.match && el.matches && el.matches(INPUT_SEL) && d.match.test(labelText(el)));
    }

    /** Tìm phần tử chính của một trường. */
    function resolve(id) {
      const d = defs.get(id);
      if (!d) return null;
      const c = elCache.get(id);
      if (c && c.el && c.el.isConnected) return c.el;
      if (c && !c.el && performance.now() - c.at < 800) return null;
      let el = null;
      for (const s of d.selectors) {
        try { el = document.querySelector(s); } catch (e) { el = null; }
        if (el) break;
      }
      if (!el && d.match) {
        for (const cand of document.querySelectorAll(INPUT_SEL)) {
          if (cand.type === "hidden" || cand.closest("[data-tml-ignore]")) continue;
          if (d.match.test(labelText(cand))) { el = cand; break; }
        }
      }
      elCache.set(id, { el, at: performance.now() });
      return el;
    }

    function fieldOf(el) {
      if (!el || !el.matches) return null;
      // ưu tiên selector chính xác; chỉ khi không trường nào khớp selector mới thử nhận theo chữ trên nhãn
      for (const d of defs.values()) if (matchesSelector(d, el)) return d;
      for (const d of defs.values()) if (matchesLabel(d, el)) return d;
      return null;
    }

    function allElements() {
      const out = [];
      for (const id of defs.keys()) { const el = resolve(id); if (el) out.push(el); }
      out.push(...calcButtons());
      return out;
    }

    function calcButtons() {
      const a = core.guide.actions && core.guide.actions.calculate;
      const list = [];
      if (!a) return list;
      for (const s of U.toArray(a.selectors)) { try { document.querySelectorAll(s).forEach(e => list.push(e)); } catch (e) { /* bỏ qua */ } }
      return list;
    }
    function isCalcTarget(el) {
      const a = core.guide.actions && core.guide.actions.calculate;
      if (!a || !el || !el.closest) return null;
      for (const s of U.toArray(a.selectors)) { try { const m = el.closest(s); if (m) return m; } catch (e) { /* bỏ qua */ } }
      if (!U.toArray(a.selectors).length && calcRe) {
        const b = el.closest("button,input[type=submit],input[type=button],[role=button]");
        if (b && calcRe.test((b.value || b.textContent || "").trim())) return b;
      }
      return null;
    }
    function resultEl() {
      const s = core.guide.actions && core.guide.actions.result && core.guide.actions.result.selector;
      if (!s) return null;
      try { return document.querySelector(s); } catch (e) { return null; }
    }
    function resultTarget() {
      const t = core.guide.actions && core.guide.actions.result && core.guide.actions.result.target;
      if (t) { try { const e = document.querySelector(t); if (e) return e; } catch (e) { /* bỏ qua */ } }
      return resultEl();
    }
    function errorEl() {
      const s = core.guide.actions && core.guide.actions.error && core.guide.actions.error.selector;
      if (!s) return null;
      try { return document.querySelector(s); } catch (e) { return null; }
    }

    /* ---- đọc và kiểm tra giá trị ---- */
    function readValue(el) {
      if (!el) return { raw: "", text: "" };
      if (el.tagName === "BUTTON") return { raw: el.value || "", text: (el.textContent || "").trim() };
      if (el.tagName === "SELECT") {
        const o = el.options[el.selectedIndex];
        return { raw: el.value, text: o ? o.text.trim() : "" };
      }
      if (el.type === "checkbox" || el.type === "radio") return { raw: el.checked ? el.value || "on" : "", text: el.checked ? (el.value || "có") : "" };
      if (el.isContentEditable && el.value === undefined) return { raw: el.textContent.trim(), text: el.textContent.trim() };
      return { raw: String(el.value ?? "").trim(), text: String(el.value ?? "").trim() };
    }
    function isEmpty(d, el) {
      const v = readValue(el);
      if (v.raw === "") return true;
      return U.toArray(d.emptyValues).map(String).includes(v.raw);
    }
    /** Trả về { ok, reason, value }. Không bịa giới hạn: chỉ dùng min/max/pattern do cấu hình khai báo. */
    function validate(d, el) {
      const v = readValue(el);
      if (isEmpty(d, el)) return { ok: false, reason: "missing", value: v };
      if (d.kind === "number") {
        const n = U.parseNumber(v.raw);
        if (!isFinite(n)) return { ok: false, reason: "nan", value: v };
        if (d.min != null && n < d.min) return { ok: false, reason: "min", value: v };
        if (d.max != null && n > d.max) return { ok: false, reason: "max", value: v };
      }
      if (d.pattern && !asRegex(d.pattern).test(v.raw)) return { ok: false, reason: "pattern", value: v };
      if (typeof d.validate === "function") {
        const r = d.validate(v.raw, el);
        if (r === false) return { ok: false, reason: "generic", value: v };
        if (typeof r === "string") return { ok: false, reason: "custom", message: r, value: v };
      }
      return { ok: true, value: v };
    }
    /** Danh sách trường thiếu/không hợp lệ theo thứ tự quy trình. */
    function problems() {
      const out = [];
      const list = [...defs.values()].filter(d => d.required).sort((a, b) => a.order - b.order);
      for (const d of list) {
        const el = resolve(d.id);
        if (!el || !U.isShown(el) || el.disabled) continue;
        const r = validate(d, el);
        if (!r.ok) out.push({ def: d, el, reason: r.reason, message: r.message });
      }
      return out;
    }
    /** Giới hạn Min–Max do người dùng tự thiết lập trên website (không phải do NPC tự đặt). Trả về {min,max} hoặc null. */
    function limitsOf(d, el) {
      if (typeof d.limits !== "function") return null;
      try {
        const l = d.limits(d, el) || {};
        const min = l.min == null || l.min === "" || !isFinite(Number(l.min)) ? null : Number(l.min);
        const max = l.max == null || l.max === "" || !isFinite(Number(l.max)) ? null : Number(l.max);
        return min == null && max == null ? null : { min, max };
      } catch (e) { return null; }
    }
    function outOfLimit(d, el) {
      const l = limitsOf(d, el);
      if (!l || d.kind !== "number") return null;
      const n = U.parseNumber(readValue(el).raw);
      if (!isFinite(n)) return null;
      if ((l.min != null && n < l.min) || (l.max != null && n > l.max)) {
        const range = l.min != null && l.max != null ? `${l.min}–${l.max}` : (l.min != null ? `tối thiểu ${l.min}` : `tối đa ${l.max}`);
        return { range, min: l.min, max: l.max, value: n };
      }
      return null;
    }
    function nextAfter(d) {
      const list = [...defs.values()].filter(x => x.required).sort((a, b) => a.order - b.order);
      const i = list.findIndex(x => x.id === d.id);
      for (let k = i + 1; k < list.length; k++) {
        const el = resolve(list[k].id);
        if (el && U.isShown(el)) return list[k];
      }
      return null;
    }
    function laterRequired(d) {
      const list = [...defs.values()].filter(x => x.required).sort((a, b) => a.order - b.order);
      const i = list.findIndex(x => x.id === d.id);
      return list.slice(i + 1).filter(x => { const e = resolve(x.id); return e && U.isShown(e); });
    }
    function stepInfo(d) {
      const list = [...defs.values()].filter(x => x.required).sort((a, b) => a.order - b.order).filter(x => { const e = resolve(x.id); return e && U.isShown(e); });
      const i = list.findIndex(x => x.id === d.id);
      return i < 0 ? null : { step: i + 1, total: list.length };
    }

    loadFields();
    return {
      defs, loadFields, resolve, resultTarget, fieldOf, allElements, calcButtons, isCalcTarget, resultEl, errorEl,
      readValue, isEmpty, validate, problems, nextAfter, stepInfo, laterRequired, limitsOf, outOfLimit,
      get(id) { return defs.get(id); },
      register(id, def) {
        core.guide.fields[id] = def; loadFields(); core.collision.markDirty();
      },
      unregister(id) { delete core.guide.fields[id]; loadFields(); core.collision.markDirty(); }
    };
  };
})();

/* ===== 85-interaction.js ===== */
/* NPC TÍNH MÍ LON — NPC Interaction: nhận biết thao tác của người dùng trên website */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;

  NS.M.Interaction = function Interaction(core) {
    const { bus } = core;
    let attached = false;
    const cleanups = [];
    let obsRes = null, obsErr = null, lastCalc = 0, resultObs = null, errorObs = null, domObs = null, sizeObs = null, resultTimer = 0, lastResultAt = 0, lastErrorText = "";

    const fromNpc = e => { const p = e.composedPath ? e.composedPath() : []; return p.includes(core.ui.host); };
    const target = e => (e.composedPath ? e.composedPath()[0] : e.target);
    const listen = (t, type, fn, opts) => { t.addEventListener(type, fn, opts); cleanups.push(() => t.removeEventListener(type, fn, opts)); };

    function fieldEvent(name, e) {
      if (fromNpc(e)) return;
      const el = target(e);
      const def = core.adapter.fieldOf(el);
      if (!def) return;
      const isBtn = def.kind === "button";                 // trường dạng nút (vd. chọn loại lon): chỉ phản ứng khi bấm (Safari không focus nút khi bấm)
      if ((name === "field:click") !== isBtn) return;
      const fieldEl = core.adapter.resolve(def.id) || el;
      bus.emit(name, { id: def.id, def, el: fieldEl, source: el, event: e });
    }

    function calcClick(e, kind) {
      if (fromNpc(e)) return;
      const el = target(e);
      const hit = kind === "submit" ? true : core.adapter.isCalcTarget(el);
      if (!hit) return;
      const now = Date.now();
      if (now - lastCalc < 350) return;
      lastCalc = now; lastErrorText = "";
      bus.emit("calc:click", { el: hit === true ? el : hit, event: e });
    }

    function observeResult() {
      const res = core.adapter.resultEl(), err = core.adapter.errorEl();
      // chỉ gắn lại khi phần tử kết quả/lỗi thật sự đổi (tránh làm mất bản ghi đang chờ xử lý)
      if (res === obsRes && err === obsErr && (resultObs || !res) && (errorObs || !err)) return;
      obsRes = res; obsErr = err;
      if (resultObs) { resultObs.disconnect(); resultObs = null; }
      if (errorObs) { errorObs.disconnect(); errorObs = null; }
      if (res) {
        resultObs = new MutationObserver(() => {
          const now = Date.now();
          if (now - lastResultAt < 400) return;
          lastResultAt = now;
          clearTimeout(resultTimer);
          resultTimer = setTimeout(() => {
            const text = res.textContent.trim();
            const m = core.guide.actions.result && core.guide.actions.result.match;
            if (U.isShown(res) && text && (!m || new RegExp(m instanceof RegExp ? m : m, "i").test(text))) bus.emit("calc:result", { el: res });
          }, 120);
        });
        resultObs.observe(res, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden", "style"] });
      }
      if (err) {
        errorObs = new MutationObserver(() => {
          const text = err.textContent.trim();
          const em = core.guide.actions.error && core.guide.actions.error.match;
          if (text && U.isShown(err) && text !== lastErrorText && (!em || new RegExp(em instanceof RegExp ? em : em, "i").test(text))) { lastErrorText = text; bus.emit("calc:error", { el: err, message: text }); }
          if (!text) lastErrorText = "";
        });
        errorObs.observe(err, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden", "style"] });
      }
    }

    const layoutChanged = U.rafThrottle(() => { core.collision.markDirty(); bus.emit("layout"); });
    const scrolled = () => { core.collision.markDirty(); layoutChanged(); bus.emit("scroll"); };

    function attach() {
      if (attached) return;
      attached = true;
      const cap = { capture: true };
      listen(document, "focusin", e => fieldEvent("field:focus", e), cap);
      listen(document, "focusout", e => fieldEvent("field:blur", e), cap);
      listen(document, "input", e => fieldEvent("field:input", e), cap);
      listen(document, "change", e => fieldEvent("field:change", e), cap);
      listen(document, "invalid", e => fieldEvent("field:invalid", e), cap);
      listen(document, "click", e => { fieldEvent("field:click", e); calcClick(e, "click"); }, cap);
      listen(document, "submit", e => calcClick(e, "submit"), cap);
      listen(window, "scroll", scrolled, { capture: true, passive: true });
      listen(window, "resize", () => { layoutChanged(); bus.emit("resize"); });
      if (window.visualViewport) listen(window.visualViewport, "resize", () => { layoutChanged(); bus.emit("resize"); });
      listen(document, "visibilitychange", () => bus.emit("visibility", !document.hidden));
      // Website chủ động báo bằng sự kiện tùy chỉnh (không bắt buộc)
      listen(window, "tml:calculated", e => bus.emit("calc:result", { el: core.adapter.resultEl(), detail: e.detail }));
      listen(window, "tml:error", e => bus.emit("calc:error", { el: core.adapter.errorEl(), message: e.detail && e.detail.message, detail: e.detail }));
      domObs = new MutationObserver(muts => {
        if (muts.every(m => m.target.nodeType === 1 && m.target.closest && m.target.closest("#tml-npc-host"))) return;
        layoutChanged();
        observeResult();
      });
      domObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "disabled", "open", "aria-hidden", "aria-expanded"] });
      if (window.ResizeObserver) { sizeObs = new ResizeObserver(() => layoutChanged()); sizeObs.observe(document.body); }
      observeResult();
    }

    function detach() {
      if (!attached) return;
      attached = false;
      cleanups.splice(0).forEach(fn => fn());
      if (domObs) domObs.disconnect(); domObs = null;
      if (sizeObs) sizeObs.disconnect(); sizeObs = null;
      if (resultObs) resultObs.disconnect(); resultObs = null;
      if (errorObs) errorObs.disconnect(); errorObs = null;
      obsRes = obsErr = null;
      clearTimeout(resultTimer);
      layoutChanged.cancel();
    }

    return { attach, detach, observeResult, get attached() { return attached; } };
  };
})();

/* ===== 90-guidance.js ===== */
/* NPC TÍNH MÍ LON — NPC Guidance: quản lý quy trình hướng dẫn (đi tới trường, chỉ tay, giải thích) */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  NS.M.Guidance = function Guidance(core) {
    const { cfg, bus } = core;
    const gc = cfg.guidance;
    const M = () => core.guide.messages;
    let seq = 0;                 // mỗi yêu cầu mới tăng seq; tiến trình cũ tự hủy
    let mode = "idle";           // idle | going | guiding
    let cur = null;              // { id, def, el, standSide, lastRect }
    let holdTimer = 0, focusTimer = 0, changeTimer = 0, settleTimer = 0, relayoutBusy = false;
    let lastProblemAt = 0, pendingCalc = false, pendingCalcTimer = 0;
    const seen = {};             // số lần đã giải thích từng trường
    let lastValidMsgAt = {};

    /* ---------- tiện ích ---------- */
    const T = (def, el) => (def && def.pointAt && el && el.closest && el.closest(def.pointAt)) || el;   // phần tử dùng để đứng cạnh/chỉ (vd. cả thẻ chứa ô)
    const rectOf = el => U.rect(el);
    const inView = el => {
      const r = rectOf(el), vw = U.viewW(), vh = U.viewH();
      const w = Math.min(r.right, vw) - Math.max(r.left, 0), h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      return w > 0 && h > 0 && (w * h) / Math.max(1, r.width * r.height) > 0.3;
    };
    function waitScrollEnd(maxMs = 1200) {
      return new Promise(res => {
        let lastY = scrollY, lastX = scrollX, stable = 0; const t0 = performance.now();
        const t = setInterval(() => {
          if (scrollY === lastY && scrollX === lastX) stable++; else { stable = 0; lastY = scrollY; lastX = scrollX; }
          if (stable >= 3 || performance.now() - t0 > maxMs) { clearInterval(t); res(); }
        }, 50);
      });
    }
    const faceToward = (npcR, tr) => {
      const dx = (tr.left + tr.right) / 2 - (npcR.left + npcR.right) / 2, dy = (tr.top + tr.bottom) / 2 - (npcR.top + npcR.bottom) / 2;
      return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    };
    const ctxFor = (def, el) => {
      const v = el ? core.adapter.readValue(el) : { text: "", raw: "" };
      const nxt = def && def.id ? core.adapter.nextAfter(def) : null;
      const step = def && def.id ? core.adapter.stepInfo(def) : null;
      const calc = (core.guide.actions.calculate && core.guide.actions.calculate.label) || "nút Tính";
      const res = (core.guide.actions.result && core.guide.actions.result.label) || "khu vực kết quả";
      return {
        label: def ? def.label || def.id : "", value: v.text || v.raw, id: def && def.id,
        fieldsToFill: def && def.id ? U.joinVi(core.adapter.laterRequired(def).map(x => x.label)) : "",
        next: nxt ? nxt.label : "", nextId: nxt ? nxt.id : "", calc, resultLabel: res,
        min: def && def.min, max: def && def.max, step: step ? step.step : "", total: step ? step.total : ""
      };
    };
    function titleFor(def, type) {
      if (def && gc.showStep) {
        const s = core.adapter.stepInfo(def);
        if (s) return U.fmt(M().step, { step: s.step, total: s.total }) + " · " + def.label;
      }
      if (def && def.label) return def.label;
      return { error: M().titleError, warn: M().titleWarn, success: M().titleSuccess }[type] || M().titleInfo;
    }

    /* ---------- vòng đời hướng dẫn ---------- */
    function clearHold() { clearTimeout(holdTimer); holdTimer = 0; }
    function startHold(ms) {
      clearHold();
      holdTimer = setTimeout(() => release("hold-expired"), ms != null ? ms : gc.holdMs);
    }
    /** Hướng dẫn xong: bỏ mũi tên; quay lại đi dạo hoặc đứng chờ. */
    function release(reason) {
      clearHold();
      core.pointer.hide();
      const was = mode;
      mode = "idle"; cur = null;
      if (was !== "idle") bus.emit("guide:end", reason);
      if (gc.afterGuide === "roam") core.movement.roam.resume("guidance", cfg.roaming.resumeAfterGuideMs);
      else core.movement.roam.resume("guidance", 600), core.movement.roam.pause("guidance-wait");
    }
    /** Hủy ngay (ví dụ tắt NPC, trường bị ẩn). */
    function cancel(reason) {
      seq++; clearHold(); clearTimeout(focusTimer); clearTimeout(changeTimer); clearTimeout(settleTimer); clearTimeout(pendingCalcTimer);
      pendingCalc = false;
      core.pointer.hide();
      core.movement.cancel("guidance-cancel");
      const was = mode; mode = "idle"; cur = null;
      if (was !== "idle") bus.emit("guide:end", reason || "cancel");
    }

    /**
     * Yêu cầu hướng dẫn.
     * req: { id, def, el, text, title, type, key, priority, go, scroll, point, hold, force, expression }
     */
    async function request(req) {
      if (core.destroyed || !core.state.enabled || !gc.enabled) return false;
      if (core.suspended()) return false;                   // đang có hộp thoại che trang
      const my = ++seq;
      clearTimeout(settleTimer);
      core.movement.roam.resume("guidance-wait", 0); // thoát chế độ chờ nếu có
      core.movement.roam.pause("guidance");
      const el = req.el || null;
      const def = req.def || (req.id ? core.adapter.get(req.id) : null);
      const sameTarget = cur && el && cur.el === el;

      if (!el) {                                   // chỉ nói, không đi đâu cả
        if (req.text) core.dialogue.show({ text: req.text, title: req.title, type: req.type, key: req.key, priority: req.priority, force: req.force, ms: req.ms });
        if (mode === "idle") { core.movement.roam.resume("guidance", cfg.roaming.resumeAfterGuideMs); }
        return true;
      }
      if (!sameTarget) { core.dialogue.hide("new-target"); core.pointer.hide(); }
      mode = sameTarget ? mode : "going";
      cur = { id: def && def.id, def, el, side: sameTarget ? cur.side : null };
      bus.emit("guide:start", { id: cur.id, el, reason: req.reason });

      // cuộn trường vào vùng nhìn thấy nếu cần
      if (req.scroll !== false && gc.scrollIntoView && !inView(el)) {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: core.reduced() ? "auto" : "smooth" });
        await waitScrollEnd();
        if (my !== seq) return false;
        core.collision.markDirty();
      }
      if (!U.isShown(el)) { if (my === seq) release("target-hidden"); return false; }

      if (gc.autoGo && req.go !== false) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const tr = rectOf(el);
          const stand = core.positioning.computeStand(tr, { el });
          cur.side = stand.side; cur.stand = stand; cur.lastRect = tr;
          const dist = Math.hypot(stand.x - core.pos.x, stand.y - core.pos.y);
          if (dist > 3) {
            const res = await core.movement.moveTo(stand, { bounds: "view", run: dist > gc.runDistance, force: true, maxDetour: 1.4, face: stand.face });
            if (my !== seq) return false;
            if (res === "cancelled" || res === "replaced") return false;
          }
          const r2 = rectOf(el);
          if (!U.isShown(el)) { release("target-hidden"); return false; }
          if (Math.abs(r2.left - tr.left) + Math.abs(r2.top - tr.top) <= gc.retargetTolerance * 2) { cur.lastRect = r2; break; }
          await sleep(60); // trường dịch chuyển trong lúc đi (cuộn / thay đổi bố cục): tính lại chỗ đứng
          if (my !== seq) return false;
        }
        const face = cur.stand ? cur.stand.face : faceToward(core.npcRect(), rectOf(el));
        core.movement.face(face);
      } else {
        cur.lastRect = rectOf(el);
        core.movement.face(faceToward(core.npcRect(), cur.lastRect));
      }

      mode = "guiding";
      if (req.expression) core.animation.expression(req.expression, 900);
      if (req.point !== false) core.pointer.show(el);
      if (req.text) core.dialogue.show({ text: req.text, title: req.title, type: req.type, key: req.key, priority: req.priority, force: req.force, ms: req.ms });
      startHold(req.hold);
      return true;
    }

    /* ---------- tạo nội dung theo trường ---------- */
    function focusText(def, el) {
      const n = (seen[def.id] = (seen[def.id] || 0) + 1);
      const ctx = ctxFor(def, el);
      if (n === 1 && def.explain) return { text: U.fmt(def.explain, ctx), key: "focus:" + def.id };
      const hint = def.hint || def.explain;
      return hint ? { text: U.fmt(hint, ctx), key: "hint:" + def.id } : { text: "" };
    }

    function onFocus(p) {
      if (!gc.onFocus) return;
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const { def, el } = p;
        if (!U.isShown(el)) return;
        const t = focusText(def, el);
        request({ id: def.id, def, el: T(def, el), text: t.text, key: t.key, title: titleFor(def, "info"), type: "info", reason: "focus" });
      }, gc.debounceMs);
    }

    /** Trường dạng nút (vd. chọn loại lon): giải thích rồi (nếu def.goto) đi tới trường kế tiếp khi màn hình đã chuyển. */
    async function onClickField(p) {
      if (!gc.onFocus) return;
      const { def, el } = p;
      clearTimeout(focusTimer);
      const my = seq;
      const ctx = ctxFor(def, el);
      let dest = el;
      if (def.goto) {
        const t0 = performance.now();
        while (performance.now() - t0 < 500) {
          const g = core.adapter.resolve(def.goto);
          if (g && U.isShown(g)) { dest = g; break; }
          await sleep(50);
        }
        if (dest !== el) { await waitScrollEnd(900); core.collision.markDirty(); }
      }
      if (my !== seq && cur) { /* có yêu cầu khác chen vào: vẫn ưu tiên thao tác mới nhất */ }
      const gdef = dest !== el ? core.adapter.get(def.goto) : def;
      const ctx2 = ctxFor(def, el);
      ctx2.fieldsToFill = dest !== el ? U.joinVi([...core.adapter.defs.values()].filter(x => x.required).sort((a, b) => a.order - b.order).filter(x => { const e2 = core.adapter.resolve(x.id); return e2 && U.isShown(e2); }).map(x => x.label)) : ctx2.fieldsToFill;
      const text = selectMessage(def, el, ctx2);
      request({ id: gdef && gdef.id, def: gdef, el: T(gdef, dest), text, key: "click:" + def.id + ":" + ctx.value, title: ctx.value || def.label, type: "info", reason: "click", force: true });
    }

    function selectMessage(def, el, ctx) {
      const v = core.adapter.readValue(el);
      const opts = def.options || {};
      let m = opts[v.raw];
      if (m == null) m = opts[v.text];
      if (m == null) for (const k of Object.keys(opts)) { if (k.startsWith("/") && k.lastIndexOf("/") > 0) { try { const re = new RegExp(k.slice(1, k.lastIndexOf("/")), k.slice(k.lastIndexOf("/") + 1) || "i"); if (re.test(v.text) || re.test(v.raw)) { m = opts[k]; break; } } catch (e) { /* bỏ qua */ } } }
      if (m != null) return U.fmt(m, ctx);
      if (def.kind === "button" && !def.onChange) return U.fmt(def.onClick || def.explain || M().selectDefault, ctx);
      if (def.onChange) return U.fmt(def.onChange, ctx);
      return U.fmt(ctx.next ? M().selectDefaultNext : M().selectDefault, ctx);
    }

    function invalidText(def, reason, el, custom) {
      const ctx = ctxFor(def, el);
      const own = def.invalid && (def.invalid[reason] || def.invalid.default);
      if (own) return U.fmt(own, ctx);
      if (custom) return custom;
      const k = { nan: "invalidNumber", min: "invalidMin", max: "invalidMax", pattern: "invalidPattern", missing: "missingOne" }[reason] || "invalidGeneric";
      return U.fmt(M()[k], Object.assign({ list: ctx.label }, ctx));
    }

    function handleChange(p, immediate) {
      if (!gc.onChange) return;
      const { def, el } = p;
      const isSelect = el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio";
      const run = () => {
        if (!U.isShown(el)) return;
        const r = core.adapter.validate(def, el);
        const ctx = ctxFor(def, el);
        let text, type = "info", expression = null, key = "change:" + def.id + ":" + (r.value && r.value.raw);
        if (isSelect && r.ok) text = selectMessage(def, el, ctx);
        else if (!r.ok && r.reason === "missing") return;           // đã xóa trống: không nhắc
        else if (!r.ok) { text = invalidText(def, r.reason, el, r.message); type = "warn"; expression = "alert"; key = "invalid:" + def.id; }
        else {
          const now = Date.now();
          if (now - (lastValidMsgAt[def.id] || 0) < 3500) return;
          lastValidMsgAt[def.id] = now;
          if (def.onValid) text = U.fmt(def.onValid, ctx);
          else if (ctx.next) text = U.fmt(M().validNext, ctx);
          else text = core.adapter.problems().length ? U.fmt(M().validOk, ctx) : U.fmt(M().allFilled, ctx);
        }
        const lim = !isSelect && r.ok ? core.adapter.outOfLimit(def, el) : null;
        if (lim) {                                           // giá trị hợp lệ nhưng vượt giới hạn Min–Max do người dùng tự thiết lập trên website
          text = U.fmt(M().outOfLimit, Object.assign({}, ctx, { range: lim.range }));
          type = "warn"; expression = "alert"; key = "limit:" + def.id + ":" + lim.value;
        }
        request({ id: def.id, def, el: T(def, el), text, key, title: titleFor(def, type), type, expression, reason: "change", go: true, force: true });
      };
      clearTimeout(changeTimer);
      if (immediate || isSelect) run(); else changeTimer = setTimeout(run, gc.inputFeedbackMs);
    }

    function onBlur() {
      if (mode !== "guiding") return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const a = document.activeElement;
        if (a && core.adapter.fieldOf(a)) return;         // đã chuyển sang trường khác
        if (mode === "guiding") startHold(gc.blurHoldMs);
      }, 250);
    }

    function onInput(p) {
      if (mode === "guiding" && cur && cur.el === T(p.def, p.el)) startHold(gc.holdMs); // người dùng đang nhập: kéo dài thời gian chờ
    }

    /* ---------- tính toán ---------- */
    function onCalcClick() {
      const probs = core.adapter.problems();
      clearTimeout(pendingCalcTimer); clearTimeout(changeTimer); clearTimeout(focusTimer); // bấm Tính ưu tiên hơn phản hồi nhập liệu đang chờ
      if (probs.length) {
        pendingCalc = false; lastProblemAt = Date.now();
        const missing = probs.filter(x => x.reason === "missing").map(x => x.def.label);
        const bad = probs.filter(x => x.reason !== "missing");
        let text;
        if (!bad.length) text = U.fmt(missing.length === 1 ? M().missingOne : M().missingMany, { list: U.joinVi(missing) });
        else if (!missing.length && bad.length === 1) text = invalidText(bad[0].def, bad[0].reason, bad[0].el, bad[0].message);
        else text = U.fmt(M().problemsMixed, { list: U.joinVi(probs.map(x => x.def.label)) });
        const f = probs[0];
        request({ id: f.def.id, def: f.def, el: f.el, text, title: M().titleError, type: "error", key: "calc-problem", force: true, expression: "alert", reason: "calc-problem", scroll: true });
        bus.emit("calc:problems", probs);
        return;
      }
      pendingCalc = true;
      pendingCalcTimer = setTimeout(() => { pendingCalc = false; }, gc.resultWaitMs + 4000);
    }
    function onCalcResult(p) {
      const mode0 = (core.guide.actions.result && core.guide.actions.result.mode) || "afterClick";
      if (!pendingCalc && mode0 !== "any") return;
      pendingCalc = false; clearTimeout(pendingCalcTimer);
      const el = core.adapter.resultTarget() || (p && p.el);
      const ctx = ctxFor(null, null);
      const act = core.guide.actions.result || {};
      let text = U.fmt(act.label ? M().calcSuccessGuide : M().calcSuccess, ctx), type = "success";
      if (typeof act.describe === "function") {              // website tự mô tả kết quả bằng chính dữ liệu đang hiển thị
        try { const d = act.describe(ctx) || {}; if (d.text) text = d.text; if (d.type) type = d.type; } catch (e) { /* dùng câu mặc định */ }
      }
      request({ id: "result", def: { id: "result", label: "Kết quả" }, el: el && U.isShown(el) ? el : null, text, title: type === "success" ? M().titleSuccess : M().titleWarn, type, key: "calc-success", force: true, expression: "happy", reason: "calc-result", scroll: true });
      bus.emit("calc:done", p);
    }
    function onCalcError(p) {
      if (Date.now() - lastProblemAt < 1500) return;      // đã báo thiếu dữ liệu rồi
      pendingCalc = false;
      const text = (p && p.message) ? String(p.message).slice(0, 220) : U.fmt(M().calcError, {});
      const probs = core.adapter.problems();
      const f = probs[0];
      const el = f ? f.el : (p && p.el && U.isShown(p.el) ? p.el : null);
      request({ id: f && f.def.id, def: f && f.def, el, text, title: M().titleError, type: "error", key: "calc-error", force: true, expression: "alert", reason: "calc-error" });
    }
    function onNativeInvalid(p) {
      if (Date.now() - lastProblemAt < 800) return;
      lastProblemAt = Date.now();
      const el = p.el; const r = core.adapter.validate(p.def, el);
      request({ id: p.def.id, def: p.def, el, text: invalidText(p.def, r.ok ? "generic" : r.reason, el, r.message), title: titleFor(p.def, "warn"), type: "warn", key: "invalid:" + p.def.id, force: true, expression: "alert", reason: "invalid" });
    }

    /* ---------- bố cục thay đổi / cuộn / đổi cỡ cửa sổ ---------- */
    let relayoutTimer = 0;
    function onLayout() {
      if (core.destroyed || !core.state.enabled) return;
      if (mode === "idle") { clearTimeout(relayoutTimer); relayoutTimer = setTimeout(() => core.movement.settle("roam"), 220); return; }
      clearTimeout(relayoutTimer);
      relayoutTimer = setTimeout(relayout, 180);        // đợi người dùng cuộn xong
    }
    async function relayout() {
      if (mode !== "guiding" || !cur || relayoutBusy || core.movement.busy) return;
      const el = cur.el, my = seq;
      if (!U.isShown(el)) { core.dialogue.hide("target-lost"); release("target-hidden"); return; }
      if (!inView(el)) { core.dialogue.hide("target-offscreen"); release("target-offscreen"); return; }
      const tr = rectOf(el);
      const moved = !cur.lastRect || Math.abs(tr.left - cur.lastRect.left) + Math.abs(tr.top - cur.lastRect.top) + Math.abs(tr.width - cur.lastRect.width) + Math.abs(tr.height - cur.lastRect.height) > gc.retargetTolerance;
      const npcBad = !core.collision.isFree(core.pos.x, core.pos.y, { ignore: o => o.el && (o.el === el || el.contains(o.el) || o.el.contains(el)) });
      if (!moved && !npcBad) { core.pointer.update(); return; }
      relayoutBusy = true;
      try {
        const stand = core.positioning.computeStand(tr, { el });
        cur.stand = stand; cur.side = stand.side; cur.lastRect = tr;
        const d = Math.hypot(stand.x - core.pos.x, stand.y - core.pos.y);
        if (d > 3) {
          const res = await core.movement.moveTo(stand, { bounds: "view", run: d > gc.runDistance, force: true, face: stand.face });
          if (my !== seq || res === "replaced" || res === "cancelled") return;
        }
        core.movement.face(stand.face);
        core.pointer.update(); core.dialogue.place();
      } finally { relayoutBusy = false; }
    }
    function onTargetLost() {
      if (mode === "idle") return;
      core.dialogue.hide("target-lost");
      release("target-hidden");
    }

    /* ---------- đăng ký sự kiện ---------- */
    const offs = [];
    function bind() {
      offs.push(
        bus.on("field:focus", onFocus),
        bus.on("field:blur", onBlur),
        bus.on("field:click", onClickField),
        bus.on("field:input", onInput),
        bus.on("field:change", p => handleChange(p, false)),
        bus.on("field:invalid", onNativeInvalid),
        bus.on("calc:click", onCalcClick),
        bus.on("calc:result", onCalcResult),
        bus.on("calc:error", onCalcError),
        bus.on("layout", onLayout),
        bus.on("resize", () => { core.refreshScale(); onLayout(); }),
        bus.on("target:lost", onTargetLost)
      );
    }
    function unbind() { offs.splice(0).forEach(f => f && f()); }

    /* ---------- API công khai ---------- */
    function resolveTarget(idOrEl) {
      if (idOrEl instanceof Element) return { el: idOrEl, def: core.adapter.fieldOf(idOrEl) };
      const def = core.adapter.get(idOrEl);
      return def ? { el: core.adapter.resolve(idOrEl), def } : { el: null, def: null };
    }
    function goTo(idOrEl, opts = {}) {
      const { el, def } = resolveTarget(idOrEl);
      if (!el) return Promise.resolve(false);
      return request({ id: def && def.id, def, el, text: opts.text || "", title: opts.title, type: opts.type || "info", force: true, reason: "api", hold: opts.hold, scroll: opts.scroll });
    }
    function explain(idOrEl, opts = {}) {
      const { el, def } = resolveTarget(idOrEl);
      if (!el || !def) return Promise.resolve(false);
      const ctx = ctxFor(def, el);
      const text = opts.text || U.fmt(def.explain || def.hint || "", ctx);
      return request({ id: def.id, def, el, text, title: titleFor(def, "info"), type: opts.type || "info", force: true, reason: "api", hold: opts.hold });
    }
    function notify(text, opts = {}) {
      return request({ text, title: opts.title, type: opts.type || "info", force: opts.force !== false, key: opts.key, ms: opts.ms, el: opts.el || null, reason: "notify" });
    }

    return {
      bind, unbind, request, cancel, release, goTo, explain, notify, onLayout,
      get mode() { return mode; },
      get current() { return cur; },
      targetRect() { return cur && cur.el && U.isShown(cur.el) ? rectOf(cur.el) : null; },
      resetSeen() { for (const k of Object.keys(seen)) delete seen[k]; lastValidMsgAt = {}; }
    };
  };
})();

/* ===== 99-core.js ===== */
/* NPC TÍNH MÍ LON — NPC Core: vòng đời, giao diện, nút ON/OFF, API công khai */
(() => {
  "use strict";
  const NS = window.TinhMiLonNPC;
  const U = NS.util;
  const CSS = "/* NPC TÍNH MÍ LON v0.5.0 — CSS nằm trong Shadow DOM nên không ảnh hưởng và không bị ảnh hưởng bởi CSS của website */\n:host{all:initial}\n*,*::before,*::after{box-sizing:border-box}\n.tml-layer{position:fixed;inset:0;pointer-events:none;font:14px/1.45 system-ui,-apple-system,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;color:#25213a}\n[hidden]{display:none!important}\n\n/* ---------- Nhân vật ---------- */\n.tml-npc{position:absolute;left:0;top:0;width:80px;height:144px;transform-origin:0 0;will-change:transform;pointer-events:auto;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;outline:none}\n.tml-npc__shadow{transform-origin:50% 50%;position:absolute;left:14px;right:14px;bottom:2px;height:10px;border-radius:50%;background:radial-gradient(ellipse at center,#0005,#0000 70%);pointer-events:none}\n.tml-npc__sprite{transform-origin:50% 100%;will-change:transform;position:relative;display:block;width:80px;height:144px;object-fit:contain;image-rendering:pixelated;pointer-events:none;-webkit-user-drag:none}\n@keyframes tml-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}\n.tml-npc:focus-visible{outline:2px dashed #8b6bd6;outline-offset:4px;border-radius:8px}\n\n/* ---------- Bong bóng hội thoại ---------- */\n.tml-bubble{position:absolute;left:0;top:0;min-width:150px;max-width:272px;padding:10px 32px 11px 13px;border:2px solid #cdb6ff;border-radius:14px;background:#fff;color:#25213a;box-shadow:0 6px 22px #0003;pointer-events:auto;will-change:transform;--tml-tail:30px;--tml-accent:#8b6bd6}\n.tml-bubble[data-type=\"warn\"]{border-color:#f2b84b;--tml-accent:#b9790a}\n.tml-bubble[data-type=\"error\"]{border-color:#ef7b7b;--tml-accent:#c23030}\n.tml-bubble[data-type=\"success\"]{border-color:#6fcf97;--tml-accent:#1f8f4f}\n.tml-bubble__title{margin:0 0 3px;font-size:11.5px;font-weight:700;letter-spacing:.2px;text-transform:none;color:var(--tml-accent)}\n.tml-bubble__text{font-size:13.5px;font-weight:500;white-space:pre-line;overflow-wrap:anywhere}\n.tml-bubble__text strong{font-weight:700}\n.tml-bubble__close{position:absolute;top:5px;right:6px;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:#6b6585;font:700 16px/22px system-ui,sans-serif;cursor:pointer;padding:0}\n.tml-bubble__close:hover{background:#0000000f;color:#25213a}\n.tml-bubble__close:focus-visible{outline:2px solid #8b6bd6}\n.tml-bubble::after{content:\"\";position:absolute;width:12px;height:12px;background:#fff;border:2px solid inherit;border-color:inherit}\n.tml-bubble[data-tail=\"bottom\"]::after{bottom:-8px;left:var(--tml-tail);margin-left:-6px;transform:rotate(45deg);border-top-color:transparent;border-left-color:transparent}\n.tml-bubble[data-tail=\"top\"]::after{top:-8px;left:var(--tml-tail);margin-left:-6px;transform:rotate(45deg);border-bottom-color:transparent;border-right-color:transparent}\n.tml-bubble[data-tail=\"right\"]::after{right:-8px;top:var(--tml-tail);margin-top:-6px;transform:rotate(45deg);border-bottom-color:transparent;border-left-color:transparent}\n.tml-bubble[data-tail=\"left\"]::after{left:-8px;top:var(--tml-tail);margin-top:-6px;transform:rotate(45deg);border-top-color:transparent;border-right-color:transparent}\n\n/* ---------- Mũi tên chỉ & khung sáng ---------- */\n.tml-arrow{position:absolute;left:0;top:0;width:56px;height:28px;transform-origin:0 0;pointer-events:none;will-change:transform}\n.tml-arrow svg{display:block;width:56px;height:28px;overflow:visible;animation:tml-bob .9s ease-in-out infinite;filter:drop-shadow(0 2px 3px #0004)}\n@keyframes tml-bob{0%,100%{transform:translateX(-5px)}50%{transform:translateX(3px)}}\n.tml-line{position:absolute;left:0;top:0;height:0;border-top:3px dotted #8b6bd6;transform-origin:0 0;pointer-events:none;opacity:.85}\n.tml-ring{position:absolute;left:0;top:0;border:3px solid #8b6bd6;pointer-events:none;will-change:transform;box-shadow:0 0 0 3px #8b6bd633,0 0 14px #8b6bd688;animation:tml-pulse 1.4s ease-in-out infinite}\n@keyframes tml-pulse{0%,100%{opacity:.95}50%{opacity:.5}}\n\n/* ---------- Nút bật/tắt ---------- */\n.tml-toggle.tml-toggle--round{--s:var(--tml-size,54px);width:var(--s);height:var(--s);padding:0;gap:0;justify-content:center;border:1px solid var(--border,#e4e7ee);border-radius:50%;background:var(--card,#fff);color:var(--blue,#0a7cff);box-shadow:var(--shadow,0 4px 16px #0003);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:transform .12s}\n.tml-toggle.tml-toggle--round:hover{background:var(--card,#fff)}\n.tml-toggle.tml-toggle--round:active{transform:scale(.96)}\n.tml-toggle.tml-toggle--round:focus-visible{outline:3px solid var(--blue,#0a7cff);outline-offset:3px}\n.tml-toggle.tml-toggle--round .tml-toggle__label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n.tml-toggle.tml-toggle--round[aria-checked=\"true\"]{background:var(--blue,#0a7cff);color:#fff;border-color:transparent}\n.tml-toggle.tml-toggle--round[aria-checked=\"true\"] .tml-toggle__slash{display:none}\n.tml-toggle.tml-toggle--round[aria-checked=\"false\"]{background:var(--card,#fff);color:var(--muted,#8a90a2)}\n\n.tml-toggle-wrap{position:absolute;display:flex;gap:6px;pointer-events:auto}\n.tml-toggle-wrap.tml-inline{position:static;display:inline-flex}\n.tml-toggle{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px 0 10px;border:1.5px solid #cdb6ff;border-radius:999px;background:#fff;color:#2b2545;font:700 12.5px/1 system-ui,-apple-system,\"Segoe UI\",Roboto,Arial,sans-serif;letter-spacing:.2px;cursor:pointer;box-shadow:0 2px 10px #0003;white-space:nowrap}\n.tml-toggle:hover{background:#f5efff}\n.tml-toggle:focus-visible{outline:2px solid #8b6bd6;outline-offset:2px}\n.tml-toggle__dot{width:11px;height:11px;border-radius:50%;background:#9aa0b4;box-shadow:inset 0 0 0 2px #fff,0 0 0 1.5px #9aa0b4}\n.tml-toggle[aria-checked=\"true\"] .tml-toggle__dot{background:#27ae60;box-shadow:inset 0 0 0 2px #fff,0 0 0 1.5px #27ae60}\n.tml-toggle[aria-checked=\"false\"]{color:#5b5775;background:#f1eff7}\n.tml-toggle--roam{padding:0 11px;font-weight:600}\n\n@media (prefers-reduced-motion:reduce){\n  .tml-npc__sprite,.tml-arrow svg,.tml-line{position:absolute;left:0;top:0;height:0;border-top:3px dotted #8b6bd6;transform-origin:0 0;pointer-events:none;opacity:.85}\n.tml-ring{animation:none!important}\n}\n";
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  let instance = null;

  function guessAssetBase() {
    if (!SCRIPT_SRC) return ".";
    const dir = SCRIPT_SRC.replace(/[?#].*$/, "").replace(/\/[^/]*$/, "");
    return dir.replace(/\/dist$/, "").replace(/\/src$/, "");
  }

  function h(tag, cls, attrs) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (attrs) Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
    return el;
  }

  function createNPC(options = {}) {
    if (instance) instance.destroy();
    const cfg = NS.M.Settings.build(options);
    const store = NS.M.Settings.store(cfg);
    const stored = store.read();
    const bus = U.emitter();
    const manifest = cfg.manifest || NS.EMBEDDED_MANIFEST;
    const base = (cfg.assetBase != null ? String(cfg.assetBase) : guessAssetBase()).replace(/\/$/, "");
    const frameW = (manifest.frameSize && manifest.frameSize.width) || 80;
    const frameH = (manifest.frameSize && manifest.frameSize.height) || 144;

    /* ---------- hộp thoại của website đang mở → ẩn NPC (thuần CSS, không tốn timer) ---------- */
    let suspendStyle = null;
    if (cfg.suspendWhen && cfg.suspendWhen.length) {
      suspendStyle = document.createElement("style");
      suspendStyle.setAttribute("data-tml-ignore", "");
      suspendStyle.textContent = cfg.suspendWhen.map(sel => `${sel} #tml-npc-host{display:none!important}`).join("\n");
      document.head.appendChild(suspendStyle);
    }

    /* ---------- giao diện (Shadow DOM) ---------- */
    const host = h("div", null, { id: "tml-npc-host", "data-tml-ignore": "" });
    host.style.cssText = `all:initial;position:fixed;inset:0;z-index:${cfg.zIndex};pointer-events:none;`;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style"); style.textContent = CSS; shadow.append(style);
    const layer = h("div", "tml-layer");
    const ring = h("div", "tml-ring"); ring.hidden = true;
    const line = h("div", "tml-line"); line.hidden = true;
    const arrow = h("div", "tml-arrow"); arrow.hidden = true;
    arrow.innerHTML = '<svg viewBox="0 0 56 28" aria-hidden="true"><path d="M2 10h30V2l22 12-22 12v-8H2z" fill="#8b6bd6" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>';
    const root = h("div", "tml-npc", { id: "tinh-mi-lon-npc", role: "button", tabindex: "0", "aria-label": "Trợ lý TÍNH MÍ LON. Nhấn Enter để nghe gợi ý." });
    root.hidden = true;
    if (!cfg.animation.breathing) root.classList.add("tml-nobreath");
    const shadowEl = h("div", "tml-npc__shadow");
    const sprite = h("img", "tml-npc__sprite", { alt: "Nhân vật TÍNH MÍ LON", draggable: "false" });
    root.append(shadowEl, sprite);
    const bubble = h("div", "tml-bubble", { role: "status", "aria-live": "polite", tabindex: "-1" }); bubble.hidden = true;
    const bubbleClose = h("button", "tml-bubble__close", { type: "button", "aria-label": "Đóng lời thoại" }); bubbleClose.textContent = "×";
    const bubbleTitle = h("div", "tml-bubble__title");
    const bubbleText = h("div", "tml-bubble__text");
    bubble.append(bubbleClose, bubbleTitle, bubbleText);

    let toggle = null, roamBtn = null, toggleWrap = null;
    if (cfg.toggle.show) {
      toggleWrap = h("div", "tml-toggle-wrap");
      toggle = h("button", "tml-toggle", { type: "button", role: "switch", "aria-checked": "false", "aria-label": "Bật hoặc tắt trợ lý NPC" });
      if (cfg.toggle.round) {   // kiểu nút tròn đơn giản, giống nút nhạc: chỉ có biểu tượng (chữ nằm trong aria/tooltip)
        toggle.classList.add("tml-toggle--round");
        toggle.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/><line class="tml-toggle__slash" x1="3.5" y1="3.5" x2="20.5" y2="20.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span class="tml-toggle__label"></span>';
      } else toggle.innerHTML = '<span class="tml-toggle__dot"></span><span class="tml-toggle__label"></span>';
      toggleWrap.append(toggle);
      if (cfg.toggle.roamingSwitch) {
        roamBtn = h("button", "tml-toggle tml-toggle--roam", { type: "button", role: "switch", "aria-checked": "false", "aria-label": "Bật hoặc tắt NPC tự đi dạo" });
        roamBtn.innerHTML = '<span class="tml-toggle__label"></span>';
        toggleWrap.append(roamBtn);
      }
    }
    layer.append(ring, line, arrow, root, bubble);
    if (toggleWrap) layer.append(toggleWrap);
    shadow.append(layer);

    /* ---------- core chia sẻ ---------- */
    const core = {
      cfg, guide: cfg.guide, bus, manifest, store,
      ui: { host, shadow, layer, root, sprite, bubble, bubbleTitle, bubbleText, bubbleClose, ring, arrow, line, toggle },
      pos: { x: 0, y: 0 },
      state: { enabled: false, roaming: false },
      scale: cfg.scale, destroyed: false,
      assetUrl: p => `${base}/${p}`,
      suspended: () => !!(cfg.suspendWhen && cfg.suspendWhen.length) && getComputedStyle(host).display === "none",
      reduced: () => U.reducedMotion(),
      size() { return { w: frameW * core.scale, h: frameH * core.scale }; },
      npcRect() { const s = core.size(); return U.mkRect(core.pos.x, core.pos.y, core.pos.x + s.w, core.pos.y + s.h); },
      place(x, y) {
        core.pos.x = x; core.pos.y = y;
        root.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${core.scale})`;
        bus.emit("move", core.pos);
      },
      refreshScale() {
        const s = cfg.smallScreen && U.viewW() <= cfg.smallScreen.maxWidth ? cfg.scale * cfg.smallScreen.scale : cfg.scale;
        if (s !== core.scale) { core.scale = s; core.place(core.pos.x, core.pos.y); }
      }
    };
    core.refreshScale();

    const A = NS.M;
    core.animation = A.Animation(core);
    core.adapter = A.Adapter(core);
    core.collision = A.Collision(core);
    core.positioning = A.Positioning(core);
    core.movement = A.Movement(core);
    core.pointer = A.Pointer(core);
    core.dialogue = A.Dialogue(core);
    core.interaction = A.Interaction(core);
    core.guidance = A.Guidance(core);
    core.roam = core.movement.roam;

    /* ---------- vị trí ban đầu ---------- */
    function startPoint() {
      const sp = cfg.startPosition, s = core.size();
      const x = sp.corner && sp.corner.includes("left") ? sp.offsetX : U.viewW() - s.w - sp.offsetX;
      const y = sp.corner && sp.corner.includes("top") ? sp.offsetY : U.viewH() - s.h - sp.offsetY;
      return core.collision.clampTo({ x, y }, core.collision.viewBounds());
    }

    /* ---------- nút ON/OFF ---------- */
    function placeToggle() {
      if (!toggleWrap) return;
      let mnt = null;
      if (cfg.toggle.mount) { try { mnt = document.querySelector(cfg.toggle.mount); } catch (e) { mnt = null; } }
      toggleWrap.style.cssText = "";
      let bs = null;
      if (cfg.toggle.beside) { try { bs = document.querySelector(cfg.toggle.beside); } catch (e) { bs = null; } }
      if (bs && U.isShown(bs)) {
        // đặt ngay bên trái một nút có sẵn của website (vd. nút nhạc), cùng kích thước và cùng hàng
        const r = bs.getBoundingClientRect(), gap = cfg.toggle.besideGap != null ? cfg.toggle.besideGap : 10;
        toggleWrap.style.left = Math.max(4, Math.round(r.left - r.width - gap)) + "px";
        toggleWrap.style.top = Math.round(r.top) + "px";
        toggleWrap.style.setProperty("--tml-size", Math.round(r.width) + "px");
        return;
      }
      if (mnt && U.isShown(mnt)) {
        // gắn nút "vào" một vị trí có sẵn của website: nút bám theo phần tử đó
        const r = mnt.getBoundingClientRect();
        toggleWrap.style.left = Math.round(r.left) + "px";
        toggleWrap.style.top = Math.round(r.top + (r.height - 34) / 2) + "px";
        return;
      }
      const p = cfg.toggle.position || "bottom-left", ox = cfg.toggle.offsetX, oy = cfg.toggle.offsetY;
      toggleWrap.style[p.includes("right") ? "right" : "left"] = ox + "px";
      toggleWrap.style[p.includes("top") ? "top" : "bottom"] = oy + "px";
    }
    function renderToggle() {
      if (toggle) {
        toggle.setAttribute("aria-checked", String(core.state.enabled));
        const lb = core.state.enabled ? cfg.toggle.labelOn : cfg.toggle.labelOff;
        toggle.querySelector(".tml-toggle__label").textContent = lb;
        if (cfg.toggle.round) toggle.title = lb + " — bấm để " + (core.state.enabled ? "tắt" : "bật") + " trợ lý";
      }
      if (roamBtn) {
        roamBtn.hidden = !core.state.enabled;
        roamBtn.setAttribute("aria-checked", String(core.state.roaming));
        roamBtn.querySelector(".tml-toggle__label").textContent = core.state.roaming ? "Đi dạo: BẬT" : "Đi dạo: TẮT";
      }
    }
    if (toggle) {
      placeToggle();
      if (cfg.toggle.mount || cfg.toggle.beside) { // nút bám theo vị trí gắn kết kể cả khi NPC đang tắt
        const follow = U.rafThrottle(placeToggle);
        window.addEventListener("scroll", follow, { capture: true, passive: true });
        window.addEventListener("resize", follow);
      }
      toggle.addEventListener("click", () => api.toggle());
      if (roamBtn) roamBtn.addEventListener("click", () => api.setRoaming(!core.state.roaming));
    }

    /* ---------- bật / tắt ---------- */
    let firstEnable = true, greetTimer = 0, preloaded = false;
    function enable(opts = {}) {
      if (core.destroyed || core.state.enabled) return true;
      core.state.enabled = true;
      if (opts.persist !== false) store.write({ enabled: true });
      placeToggle();
      root.hidden = false;
      if (!preloaded) { preloaded = true; core.animation.preload(); }
      core.animation.resume();
      core.refreshScale();
      if (firstEnable) { const p = startPoint(); core.place(p.x, p.y); core.animation.idle("down"); firstEnable = false; }
      else { const p = core.collision.clampTo(core.pos, core.collision.viewBounds()); core.place(p.x, p.y); }
      core.collision.markDirty();
      core.interaction.attach();
      core.guidance.bind();
      attachGlobal();
      core.dialogue.scheduleIdleChat();
      if (core.state.roaming) core.roam.start();
      renderToggle();
      core.movement.settle("view");
      let greeted = false;
      try { greeted = sessionStorage.getItem(cfg.storageKey + ":greeted") === "1"; } catch (e) { /* bỏ qua */ }
      if (cfg.dialogue.greeting && !greeted && core.guide.messages.greeting) {
        clearTimeout(greetTimer);
        greetTimer = setTimeout(() => {
          if (!core.state.enabled || core.guidance.mode !== "idle") return;
          core.animation.expression("happy", 1400);
          core.dialogue.show({ text: core.guide.messages.greeting, type: "info", priority: 1, key: "greeting", title: core.guide.messages.titleInfo });
          try { sessionStorage.setItem(cfg.storageKey + ":greeted", "1"); } catch (e) { /* bỏ qua */ }
        }, cfg.dialogue.greetingDelayMs);
      }
      bus.emit("enabled", true);
      return true;
    }

    function disable(opts = {}) {
      if (core.destroyed) return false;
      const wasOn = core.state.enabled;
      core.state.enabled = false;
      if (opts.persist !== false) store.write({ enabled: false });
      clearTimeout(greetTimer);
      core.roam.stop();
      core.guidance.cancel("disabled");
      core.guidance.unbind();
      core.movement.cancel("disabled");
      core.dialogue.hide("disabled");
      core.dialogue.stopIdleChat();
      core.pointer.hide();
      core.interaction.detach();
      detachGlobal();
      core.animation.stop();
      root.hidden = true;
      renderToggle();
      if (wasOn) bus.emit("enabled", false);
      return true;
    }

    /* ---------- sự kiện toàn cục của NPC ---------- */
    const globalOffs = [];
    function attachGlobal() {
      if (globalOffs.length) return;
      const vis = () => {
        if (document.hidden) { core.roam.pause("hidden"); core.dialogue.stopIdleChat(); }
        else { core.roam.resume("hidden", 600); core.dialogue.scheduleIdleChat(); }
      };
      document.addEventListener("visibilitychange", vis);
      globalOffs.push(() => document.removeEventListener("visibilitychange", vis));
      const onKey = e => {
        if (e.target !== root && !(e.composedPath && e.composedPath()[0] === root)) return;
        const keys = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
        if (cfg.manualControl && keys[e.key]) { e.preventDefault(); api.move(keys[e.key]); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); talk(); }
      };
      root.addEventListener("keydown", onKey);
      globalOffs.push(() => root.removeEventListener("keydown", onKey));
      if (cfg.clickToTalk) {
        const onClick = () => talk();
        root.addEventListener("click", onClick);
        globalOffs.push(() => root.removeEventListener("click", onClick));
      }
      const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq && mq.addEventListener) {
        const onMq = () => { if (mq.matches) { core.roam.stop(); } else if (core.state.roaming) core.roam.start(); };
        mq.addEventListener("change", onMq);
        globalOffs.push(() => mq.removeEventListener("change", onMq));
      }
    }
    function detachGlobal() { globalOffs.splice(0).forEach(f => f()); }

    function talk() {
      const a = document.activeElement;
      const def = a && core.adapter.fieldOf(a);
      if (def) { core.guidance.explain(a, { type: "info" }); return; }
      const tips = core.guide.messages.clickTips || [];
      core.animation.expression("happy", 1200);
      core.dialogue.show({ text: tips.length ? U.pick(tips) : core.guide.messages.greeting, type: "info", priority: 2, force: true, title: core.guide.messages.titleInfo });
    }

    /* ---------- API công khai ---------- */
    const api = {
      element: root, host, version: NS.version,
      enable, disable,
      toggle() { return core.state.enabled ? (disable(), false) : (enable(), true); },
      isEnabled: () => core.state.enabled,
      setEnabled: v => (v ? enable() : disable()),

      startRoaming() {
        core.state.roaming = true; store.write({ roaming: true }); renderToggle();
        if (core.reduced()) { core.dialogue.show({ text: core.guide.messages.reducedMotion, type: "info", key: "reduced" }); return false; }
        return core.state.enabled ? core.roam.start() : true;
      },
      stopRoaming() { core.state.roaming = false; store.write({ roaming: false }); renderToggle(); core.roam.stop(); return true; },
      setRoaming(v) { return v ? api.startRoaming() : api.stopRoaming(); },
      isRoaming: () => core.state.roaming && core.roam.active,

      pause() { core.roam.pause("api"); core.movement.cancel("paused"); },
      resume() { core.roam.resume("api", 500); },

      goToField: (idOrEl, opts) => core.guidance.goTo(idOrEl, opts),
      explain: (idOrEl, opts) => core.guidance.explain(idOrEl, opts),
      say: (text, opts = {}) => core.dialogue.show(Object.assign({ text, type: "info", force: true }, opts)),
      notify: (text, opts) => core.guidance.notify(text, opts),
      hideBubble: () => core.dialogue.hide("api"),
      stopGuidance: () => core.guidance.release("api"),

      setMessages(patch) { U.deepMerge(core.guide.messages, patch || {}); core.dialogue.resetCooldowns(); },
      setFieldText(id, patch) { const d = core.guide.fields[id]; if (d) { Object.assign(d, patch); core.adapter.loadFields(); core.dialogue.resetCooldowns(); core.guidance.resetSeen(); } },
      registerField: (id, def) => core.adapter.register(id, def),
      unregisterField: id => core.adapter.unregister(id),
      refresh() { core.adapter.loadFields(); core.collision.markDirty(); core.interaction.observeResult(); },
      updateConfig(patch) { U.deepMerge(cfg, patch || {}); core.refreshScale(); core.collision.markDirty(); },

      // tương thích v0.4.0 (say, move, setState, startRoaming, stopRoaming, setRoaming vẫn dùng như cũ)
      move: (dir, distance) => core.movement.step(dir, distance),
      setState: (s, d) => core.animation.play(s, d),

      on: (ev, fn) => bus.on(ev, fn),
      off: (ev, fn) => bus.off(ev, fn),
      getState: () => ({
        enabled: core.state.enabled, roaming: core.state.roaming, roamActive: core.roam.active, roamPaused: core.roam.reasons(),
        guidance: core.guidance.mode, target: core.guidance.current ? core.guidance.current.id : null,
        position: { x: core.pos.x, y: core.pos.y }, facing: core.movement.facing, animation: core.animation.state,
        bubbleVisible: core.dialogue.visible, pointerVisible: core.pointer.visible, scale: core.scale
      }),
      _core: core,
      destroy() {
        if (core.destroyed) return;
        disable({ persist: false });
        core.destroyed = true;
        bus.clear();
        host.remove();
        if (suspendStyle) suspendStyle.remove();
        if (instance === api) instance = null;
      }
    };

    /* ---------- khởi động ---------- */
    document.body.appendChild(host);
    const startEnabled = cfg.persist && typeof stored.enabled === "boolean" ? stored.enabled : cfg.enabled !== false;
    core.state.roaming = typeof stored.roaming === "boolean" ? stored.roaming : (options.roaming != null ? !!options.roaming : cfg.roaming.enabled !== false);
    if (options.roaming != null && !(cfg.persist && typeof stored.roaming === "boolean")) core.state.roaming = !!options.roaming;
    renderToggle();
    if (startEnabled) enable({ persist: false }); else root.hidden = true;
    instance = api;
    return api;
  }

  NS.createNPC = createNPC;
  Object.defineProperty(NS, "instance", { get: () => instance, configurable: true });
})();
