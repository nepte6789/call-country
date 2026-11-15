const $ = (id) => document.getElementById(id);
let state = null,
  noticeTimer,
  provinceList = [],
  questionBank = [];
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
  $("tryQuiz").disabled = g.quiz.phase === "rest" || g.paused;
  $("bots").textContent = m.bots.enabled ? "Tắt người thử" : "Bật người thử";
  if (document.activeElement !== $("botCount"))
    $("botCount").value = m.bots.count;
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
  $("quizCurrentPrompt").textContent = g.quiz.prompt;
  const question = questionBank.find((q) => q.id === g.quiz.questionId);
  $("quizCurrentAnswer").textContent = question
    ? `Đáp án: ${question.answers.join(" / ")}`
    : "Đang tải đáp án…";
  for (const k of ["quizCategory", "quizSeconds", "quizPoints"])
    if (!$("quizSettings").contains(document.activeElement))
      $(k).value = g.config[k];
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

function renderQuestionBank() {
  const term = $("questionSearch").value.toLocaleLowerCase("vi");
  $("questionBank").replaceChildren();
  for (const q of questionBank.filter((q) =>
    (q.prompt + " " + q.answers.join(" "))
      .toLocaleLowerCase("vi")
      .includes(term),
  )) {
    const row = document.createElement("div"),
      name = document.createElement("b"),
      answer = document.createElement("span"),
      meta = document.createElement("small");
    row.className = "bank-question";
    meta.textContent = q.category;
    name.textContent = q.prompt;
    answer.textContent = q.answers.join(" / ");
    row.append(meta, name, answer);
    $("questionBank").append(row);
  }
}
$("questionSearch").oninput = renderQuestionBank;
$("quizSettings").onsubmit = (e) => {
  e.preventDefault();
  send("configure", {
    config: {
      quizCategory: $("quizCategory").value,
      quizSeconds: Number($("quizSeconds").value),
      quizPoints: Number($("quizPoints").value),
    },
  });
};
$("nextQuiz").onclick = () => send("nextQuiz");
$("tryQuiz").onclick = () => {
  const q = questionBank.find((q) => q.id === state?.game.quiz.questionId);
  if (q && state.game.quiz.phase === "question")
    send("simulate", {
      kind: "comment",
      name: $("simName").value,
      text: q.answers[0],
    });
};
$("downloadQuestions").onclick = () => {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(questionBank, null, 2)], {
        type: "application/json",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = "call-country-questions.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
fetch("/api/questions")
  .then((r) => {
    if (!r.ok) throw Error("Không tải được câu hỏi");
    return r.json();
  })
  .then((list) => {
    questionBank = list;
    for (const category of new Set(list.map((q) => q.category))) {
      const o = document.createElement("option");
      o.value = category;
      o.textContent = category;
      $("quizCategory").append(o);
    }
    $("questionCount").textContent =
      `Xem ${list.length} câu hỏi · ${new Set(list.map((q) => q.category)).size} chủ đề`;
    renderQuestionBank();
    if (state) render(state);
  })
  .catch((e) => notice(e.message));
setInterval(() => {
  if (!state) return;
  const g = state.game,
    remaining = Math.max(
      0,
      Math.ceil((g.quiz.deadline - (g.paused ? g.pauseAt : Date.now())) / 1000),
    );
  $("quizCurrentStatus").textContent =
    `${g.quiz.category} · Câu ${g.quiz.number}/${g.quiz.total} · ${g.quiz.phase === "rest" ? "Đang nghỉ" : "Trả lời"} ${remaining} giây · Đúng +${g.quiz.reward} điểm`;
  $("tryQuiz").disabled = g.quiz.phase === "rest" || g.paused;
  const bots = state.bots;
  $("botGrowthStatus").textContent = bots.enabled
    ? `${bots.active} người thử hiện tại · ${g.paused ? "Tạm dừng thêm người" : bots.count >= 100 ? "Đã đạt giới hạn 100" : `Thêm 1–2 người sau ${Math.max(0, Math.ceil((bots.nextJoinAt - Date.now()) / 1000))} giây`}`
    : "Đã tắt tự thêm người thử";
}, 250);
