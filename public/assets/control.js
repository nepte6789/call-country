const $ = (id) => document.getElementById(id);
let state = null,
  noticeTimer,
  provinceList = [];
const send = (cmd, data = {}) =>
  socket.send(JSON.stringify({ t: "control", cmd, ...data }));
function notice(s) {
  $("notice").textContent = s;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => ($("notice").textContent = ""), 10000);
}
function render(m) {
  state = m;
  const g = m.game;
  $("liveStatus").textContent =
    m.live.status === "connected"
      ? `TikTok: @${m.live.channel} ✓`
      : "TikTok: " +
        ({
          idle: "chưa kết nối",
          connecting: "đang kết nối",
          disconnected: "mất kết nối",
          error: "lỗi",
        }[m.live.status] || m.live.status);
  $("liveStatus").className = m.live.status === "connected" ? "ok" : "";
  $("stats").textContent =
    `${g.lit}/34 tỉnh đã sáng · ${g.players} người · ${m.live.comments} bình luận LIVE`;
  $("keyStatus").textContent = m.hasApiKey
    ? "✓ Đã nạp API key EulerStream trên server"
    : "Chưa có API key EulerStream (chỉ cần nếu dịch vụ ký yêu cầu).";
  $("pause").textContent = g.paused ? "Tiếp tục" : "Tạm dừng";
  $("bots").textContent = m.bots.enabled ? "Tắt người thử" : "Bật người thử";
  $("roundTitle").textContent = "Bảng xếp hạng · Ván " + g.round;
  for (const key of ["minutes", "likesPerPoint", "coinPoints", "followPoints"])
    if (
      document.activeElement !== $(key) &&
      !$("settings").contains(document.activeElement)
    )
      $(key).value = g.config[key];
  if (m.live.channel && !$("channel").value)
    $("channel").value = "@" + m.live.channel;
  $("ranking").replaceChildren();
  g.rankings.slice(0, 10).forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "rank-row";
    const rank = document.createElement("small"),
      name = document.createElement("span"),
      score = document.createElement("b");
    rank.textContent = String(i + 1).padStart(2, "0");
    name.textContent = r.name;
    score.textContent = r.points + "đ";
    row.append(rank, name, score);
    $("ranking").append(row);
  });
  $("feed").replaceChildren();
  for (const e of [...g.feed].reverse()) {
    const p = document.createElement("p"),
      b = document.createElement("b");
    b.textContent = e.name + ": ";
    p.append(b, document.createTextNode(e.text));
    $("feed").append(p);
  }
  $("logs").textContent = m.logs.join("\n");
}
const socket = new LiveSocket(
  "control",
  (m) => {
    if (m.t === "state") render(m);
    else if (m.t === "error") notice(m.message);
  },
  (status) => {
    $("serverStatus").textContent =
      status === "connected" ? "Server: đang chạy" : "Server: đang nối lại";
    $("serverStatus").className = status === "connected" ? "ok" : "";
    if (status !== "connected")
      $("liveStatus").textContent = "TikTok: chờ server xác nhận";
  },
);
$("connect").onclick = () => send("connect", { channel: $("channel").value });
$("disconnect").onclick = () => send("disconnect");
$("pause").onclick = () => send("pause");
$("reset").onclick = () => {
  if (confirm("Xóa điểm và người tham gia để mở ván mới?")) send("reset");
};
$("settings").onsubmit = (e) => {
  e.preventDefault();
  send("configure", {
    config: Object.fromEntries(
      ["minutes", "likesPerPoint", "coinPoints", "followPoints"].map((k) => [
        k,
        Number($(k).value),
      ]),
    ),
  });
  notice("Đã gửi cài đặt. Đổi thời gian sẽ bắt đầu đếm lại từ thời điểm lưu.");
};
for (const kind of ["comment", "like", "gift", "follow"])
  $(kind).onclick = () =>
    send("simulate", {
      kind,
      name: $("simName").value,
      text: $("simText").value,
      count: kind === "like" ? 100 : 10,
    });
$("simText").onkeydown = (e) => {
  if (e.key === "Enter") $("comment").click();
};
$("bots").onclick = () =>
  send("bots", {
    on: !state?.bots.enabled,
    count: Number($("botCount").value),
  });
$("clearDemo").onclick = () => {
  if (
    confirm("Xóa toàn bộ người thử và điểm mô phỏng? Điểm người thật được giữ.")
  )
    send("clearDemo");
};
setInterval(() => {
  const a = state?.auto;
  if (!a) return;
  const left = a.nextAttemptAt
    ? Math.max(0, Math.ceil((a.nextAttemptAt - Date.now()) / 1000))
    : 0;
  $("autoStatus").textContent = a.enabled
    ? a.phase === "connected"
      ? "Kết nối ổn định · kiểm tra mỗi 2 phút"
      : `@${a.target} · ${a.phase === "connecting" ? "đang kết nối" : `thử lại sau ${left} giây`}` +
        (a.error ? " · " + a.error : "")
    : "Tự kết nối lại sau 2 phút nếu gián đoạn.";
}, 500);
fetch("/api/provinces")
  .then((r) => r.json())
  .then((list) => {
    provinceList = list;
    for (const p of list) {
      const o = document.createElement("option");
      o.value = p.name;
      $("provinces").append(o);
    }
  })
  .catch(() => notice("Không tải được danh sách tỉnh/thành"));
