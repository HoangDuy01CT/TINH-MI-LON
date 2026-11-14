/* =====================================================================
   NPC TÍNH MÍ LON — NỘI DUNG HƯỚNG DẪN cho website Tính Mí Lon (V182)

   NGUỒN CỦA TỪNG CÂU: chỉ dùng thông tin có sẵn trong chính website —
   nhãn ô (index.html), công thức và quy tắc kiểm tra (app.js: calculateOriginal,
   renderDataWarning), thông báo của website. KHÔNG có tiêu chuẩn kỹ thuật nào do NPC tự đặt.
   Giới hạn Min–Max là do NGƯỜI DÙNG tự thiết lập trong ⚙️ Cài đặt; NPC chỉ đọc lại (limitFor).
   Hai câu định nghĩa khái niệm Móc thân / Móc nắp được đánh dấu reviewed:false — phòng kỹ thuật nên duyệt.
   ===================================================================== */
(function () {
  const num = raw => parseFloat(String(raw).replace(",", "."));
  const limits = id => () => ({
    min: typeof window.limitFor === "function" ? window.limitFor(id, "Min") : null,
    max: typeof window.limitFor === "function" ? window.limitFor(id, "Max") : null
  });
  const base = (id, label, extra) => Object.assign({
    label, selectors: ["#" + id], scope: "#calculator", pointAt: ".field", kind: "number", required: true,
    limits: limits(id),
    validate: raw => (num(raw) > 0 ? true : label + " phải lớn hơn 0 (website kiểm tra số lớn hơn 0)."),
    invalid: { nan: "**" + label + "** chưa hợp lệ: chỉ nhập số (theo mm), ví dụ 1,25 hoặc 1.25." }
  }, extra);

  const fields = {
    canMenu: {
      label: "Chọn loại lon", kind: "button", required: false,
      selectors: [".menu .main-btn", ".menu .sub-btn"], goto: "BH",
      options: {
        "/^lon\\s*số\\s*3$/i": "**Lon số 3** có 3 loại: Số 3 Dẹp, Số 3 Vừa, Số 3 Cao. Hãy chọn một loại bên dưới."
      },
      explain: "Bạn đã chọn **{value}**. Hãy nhập đủ 6 thông số: {fieldsToFill}, rồi bấm **TÍNH KẾT QUẢ**. Số liệu nhập theo đơn vị mm."
    },
    BH: base("BH", "Móc thân (BH)", {
      reviewed: false,
      explain: "**Móc thân (BH · Body Hook)** là phần mép thân lon được cuốn lại thành móc khi ghép mí. Nhập số đo theo **mm** (lớn hơn 0). Website dùng BH để tính Độ chồng mí = BH + CH + Te − SL và % Móc thân.",
      hint: "Nhập Móc thân (BH) theo mm, lớn hơn 0."
    }),
    CH: base("CH", "Móc nắp (CH)", {
      reviewed: false,
      explain: "**Móc nắp (CH / EH · Cover Hook)** là phần mép nắp được cuốn lại thành móc, đan vào móc thân. Nhập số đo theo **mm** (lớn hơn 0). CH được dùng trong Độ chồng mí = BH + CH + Te − SL.",
      hint: "Nhập Móc nắp (CH) theo mm, lớn hơn 0."
    }),
    SL: base("SL", "Rộng mí (SL)", {
      explain: "**Chiều dài mí ghép – Rộng mí (SL · Seam Length)**, nhập theo **mm** (lớn hơn 0). SL có trong Độ chồng mí, % Độ chồng mí và % Móc thân. Để tính được các phần trăm, website yêu cầu SL lớn hơn 2Te + Tb.",
      hint: "Nhập Rộng mí (SL) theo mm. SL phải lớn hơn 2Te + Tb."
    }),
    ST: base("ST", "Độ dày mí (ST)", {
      explain: "**Độ dày mí ghép (ST · Seam Thickness)**, nhập theo **mm** (lớn hơn 0). Website dùng ST để tính Khoảng trống bên trong mí ghép = ST − (2Tb + 3Te).",
      hint: "Nhập Độ dày mí ghép (ST) theo mm."
    }),
    Tb: base("Tb", "Độ dày thân (Tb)", {
      explain: "**Độ dày thân lon (Tb)**: độ dày vật liệu thân lon, nhập theo **mm** (lớn hơn 0). Tb tham gia vào % Độ chồng mí, % Móc thân và Khoảng trống.",
      hint: "Nhập Độ dày thân lon (Tb) theo mm."
    }),
    Te: base("Te", "Độ dày nắp (Te)", {
      explain: "**Độ dày nắp lon (Te)**: độ dày vật liệu nắp lon, nhập theo **mm** (lớn hơn 0). Te có trong Độ chồng mí = BH + CH + Te − SL, các phần trăm và Khoảng trống.",
      hint: "Nhập Độ dày nắp lon (Te) theo mm."
    })
  };

  /* Các quy tắc kiểm tra có sẵn trong app.js (renderDataWarning). Website hiện không hiển thị khung cảnh báo này
     (không có #dataWarning trong index.html), nên NPC đọc lại chính các quy tắc đó sau khi tính. */
  function sanity() {
    const v = {}; ["BH", "CH", "SL", "ST", "Tb", "Te"].forEach(id => { const e = document.getElementById(id); v[id] = e ? num(e.value) : NaN; });
    if (Object.values(v).some(x => !isFinite(x))) return [];
    const { BH, CH, SL, ST, Tb, Te } = v, out = [];
    if (SL - (2 * Te + Tb) <= 0) out.push("SL phải lớn hơn (2Te + Tb), nếu không không thể tính % Độ chồng mí hợp lệ.");
    if (SL - 1.1 * (2 * Te + Tb) <= 0) out.push("SL phải lớn hơn 1.1 × (2Te + Tb), nếu không không thể tính % Móc thân hợp lệ.");
    if (ST < 2 * Tb + 3 * Te) out.push("Khoảng trống mí đang âm: ST nhỏ hơn (2Tb + 3Te).");
    if (BH + CH + Te - SL < 0) out.push("Độ chồng mí đang âm. Hãy kiểm tra lại BH, CH, Te và SL.");
    if (BH > SL) out.push("BH lớn hơn chiều dài mí SL, cần kiểm tra lại.");
    if (CH > SL) out.push("CH lớn hơn chiều dài mí SL, cần kiểm tra lại.");
    if (Tb > 1 || Te > 1) out.push("Độ dày vật liệu lớn hơn 1 mm. Hãy kiểm tra đơn vị và số liệu nhập.");
    if (SL > 10 || ST > 10 || BH > 10 || CH > 10) out.push("Có kích thước lớn hơn 10 mm. Hãy kiểm tra đơn vị hoặc dữ liệu nhập.");
    return out;
  }
  const text = id => { const e = document.getElementById(id); return e ? e.textContent.trim() : ""; };

  window.TML_NPC_GUIDE = {
    workflow: ["BH", "CH", "SL", "ST", "Tb", "Te"],
    fields,
    actions: {
      calculate: { selectors: [".btn.calc"], label: "nút **TÍNH KẾT QUẢ**" },
      result: {
        selector: "#message", match: "^Đã tính kết quả", target: "#qualityCard", label: "phần Kết quả bên dưới",
        describe() {
          const warns = sanity().slice(0, 2);
          let t = "Hoàn thành! Xem kết quả bên dưới: Độ chồng mí, % độ chồng mí, % móc thân và khoảng trống bên trong mí ghép.";
          const st = text("qualityStatus"), dt = text("qualityDetail");
          if (st) t += "\nĐánh giá tổng thể: **" + st + "**. " + dt;
          if (warns.length) t += "\nCần kiểm tra lại số liệu: " + warns.join(" ");
          return { text: t, type: warns.length ? "warn" : "success" };
        }
      },
      error: { selector: "#message", match: "Vui lòng|Không thể tính" }
    },
    messages: {
      greeting: "Xin chào! Mình là trợ lý **TÍNH MÍ LON**. Hãy chọn loại lon, rồi bấm vào từng ô nhập — mình sẽ đến chỉ và giải thích.",
      clickTips: [
        "Bấm vào một ô nhập, mình sẽ đến đứng cạnh và giải thích ô đó.",
        "Số liệu nhập theo đơn vị mm. Nhập đủ 6 thông số rồi bấm TÍNH KẾT QUẢ.",
        "Muốn mình nghỉ? Dùng nút “NPC: BẬT/TẮT” ở góc màn hình."
      ],
      idleChat: [
        "Mẹo: trong ⚙️ Cài đặt ngưỡng, bạn có thể thiết lập Min–Max để website đánh giá Đạt / Không đạt.",
        "Dữ liệu được lưu riêng cho từng loại lon trên thiết bị của bạn.",
        "Thông số nhập theo đơn vị mm."
      ],
      missingMany: "Còn thiếu hoặc chưa hợp lệ: {list}. Hãy nhập đủ 6 thông số (số lớn hơn 0) rồi bấm tính lại.",
      allFilled: "Đã đủ 6 thông số. Bạn có thể bấm **TÍNH KẾT QUẢ**."
    }
  };
})();
