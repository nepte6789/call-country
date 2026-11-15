const $ = (id) => document.getElementById(id),
  NS = "http://www.w3.org/2000/svg";
function fit() {
  $("stage").style.transform =
    `translate(-50%,-50%) scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`;
}
addEventListener("resize", fit);
fit();
let provinces = [],
  lookup = new Map(),
  state = null,
  offset = 0,
  lastEvent = 0,
  focusUntil = 0,
  focusId = "",
  giftUntil = 0,
  spotUntil = 0,
  voice = false,
  music = null,
  musicContext = null,
  renderKey = "",
  lastRound = 0,
  spokenQuizKey = "",
  spokenRestKey = "";
const paths = new Map();
function svg(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function avatar(p) {
  const el = document.createElement("span");
  el.className = "avatar";
  const initials = (p.name || "?")
    .split(/\s+/)
    .slice(-2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  el.textContent = initials;
  if (p.avatar && /^https?:\/\//.test(p.avatar)) {
    const im = new Image();
    im.src = p.avatar;
    im.alt = p.name;
    im.referrerPolicy = "no-referrer";
    im.onerror = () => {
      im.remove();
      el.textContent = initials;
    };
    el.replaceChildren(im);
  }
  return el;
}
function initMap() {
  const stars = svg("g", { class: "map-stars" });
  for (let i = 0; i < 85; i++)
    stars.append(
      svg("circle", {
        cx: (i * 157) % 700,
        cy: (i * 229) % 1400,
        r: i % 3 === 0 ? 1.3 : 0.6,
        fill: "#cae9ff",
        opacity: 0.08 + (i % 5) * 0.025,
      }),
    );
  $("map").insertBefore(stars, $("camera"));
  for (const p of provinces) {
    lookup.set(p.id, p);
    const el = svg("path", {
      d: p.path,
      class: "province",
      "data-id": p.id,
      "aria-label": p.name,
    });
    el.append(svg("title"));
    el.firstChild.textContent = p.name;
    el.onclick = () => focus(p.id);
    paths.set(p.id, el);
    $("provinces").append(el);
  }
  if (state) render(state);
}
function focus(id) {
  const p = lookup.get(id);
  if (!p) return;
  focusId = id;
  focusUntil = Date.now() + 5500;
  $("placeName").textContent = p.name;
  $("callout").hidden = false;
  const dx = Math.max(-70, Math.min(70, (310 - p.x) * 0.18)),
    dy = Math.max(-80, Math.min(80, (650 - p.y) * 0.1));
  $("camera").style.transform = `translate(${dx}px,${dy}px) scale(1.06)`;
}
const rewardVoice = new RewardVoice({
  onSpeaking: (active) => music?.duck(active),
  onWarning: (text) => {
    $("sound").textContent = text;
  },
});
function speak(text, priority = 1, options = {}) {
  rewardVoice.enqueue(text, priority, options);
}
function readQuizSpeech() {
  if (!voice || !state || state.game.paused) return;
  const q = state.game.quiz,
    key = `quiz-${state.game.round}-${q.id}`,
    expiresAt = q.deadline - offset;
  if (Date.now() >= expiresAt) return;
  if (q.phase === "question" && spokenQuizKey !== key) {
    if (spokenQuizKey) rewardVoice.drop(spokenQuizKey);
    spokenQuizKey = key;
    speak(
      `Câu hỏi. ${q.category === "Toán nhẩm" ? q.prompt.replace(/\+/g, " cộng ").replace(/-/g, " trừ ").replace(/×/g, " nhân ").replace(/:/g, " chia ").replace(/=/g, " bằng ").replace(/\s+/g, " ").trim() : q.prompt} Bình luận đáp án trong ${Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))} giây.`,
      2,
      { key, expiresAt, interrupt: true },
    );
  } else if (q.phase === "rest" && spokenRestKey !== key) {
    if (spokenQuizKey) rewardVoice.drop(spokenQuizKey);
    spokenRestKey = key;
    speak(
      `Hết giờ. Đáp án là ${q.answer}. Nghỉ mười giây trước câu tiếp theo.`,
      2,
      { key: key + "-rest", expiresAt, interrupt: true },
    );
  }
}
function showEvent(e) {
  if (e.type === "welcome") {
    $("spotlight").replaceChildren();
    $("spotlight").append(avatar(e));
    const body = document.createElement("div"),
      name = document.createElement("b"),
      text = document.createElement("span");
    name.textContent =
      e.welcomeCount > 1
        ? "Chào mừng " + e.welcomeCount + " người bạn mới"
        : "Chào mừng " + e.name;
    text.textContent = "Bình luận tên quê mình để thắp sáng bản đồ nhé!";
    body.append(name, text);
    $("spotlight").append(body);
    $("spotlight").hidden = Date.now() < giftUntil;
    spotUntil = Date.now() + 6500;
    speak(e.speech, 0, {
      key: `welcome-${state.game.round}-${e.id}`,
      expiresAt: Date.now() + 20000,
    });
  }

  if (e.type === "visit" || e.type === "join" || e.type === "light") {
    focus(e.province);
    $("spotlight").replaceChildren();
    $("spotlight").append(avatar(e));
    const body = document.createElement("div"),
      name = document.createElement("b"),
      text = document.createElement("span");
    name.textContent = e.name;
    text.textContent =
      (lookup.get(e.province)?.name || "Chọn quê bằng bình luận") +
      (e.points ? ` · +${e.points} điểm` : "");
    body.append(name, text);
    $("spotlight").append(body);
    $("spotlight").hidden = Date.now() < giftUntil;
    spotUntil = Date.now() + 5000;
    if (e.type === "visit")
      speak(
        `Chào ${e.name}, cùng thắp sáng ${lookup.get(e.province)?.name || "quê nhà"}.`,
        0,
      );
  }
  if (e.type === "follow" || e.type === "light") speak(e.speech);
  if (e.type === "gift" || e.type === "quiz") {
    $("giftToast").replaceChildren();
    $("giftToast").append(avatar(e));
    const body = document.createElement("div"),
      b = document.createElement("b"),
      small = document.createElement("small");
    b.textContent =
      (e.type === "gift" ? "🎁 " : "✦ ") + e.name + " · " + e.text;
    small.textContent =
      lookup.get(e.province)?.name ||
      "Điểm đang chờ — bình luận tên quê để nhận";
    body.append(b, small);
    $("giftToast").append(body);
    $("giftToast").hidden = false;
    $("spotlight").hidden = true;
    spotUntil = 0;
    giftUntil = Date.now() + 6000;
    if (e.province) focus(e.province);
    speak(e.speech || `Chúc mừng ${e.name} nhận được ${e.points} điểm thưởng.`);
  }
}
function render(m) {
  state = m;
  const g = m.game;
  offset = g.serverTime - Date.now();
  $("lit").replaceChildren(
    document.createTextNode(String(g.lit).padStart(2, "0")),
  );
  const part = document.createElement("span");
  part.textContent = "/34";
  $("lit").append(part);
  $("population").textContent = g.players;
  $("round").textContent = "VÁN " + String(g.round).padStart(2, "0");
  $("progress").style.width = (g.lit / 34) * 100 + "%";
  $("pauseBanner").hidden = !g.paused;
  $("likeRule").textContent = g.config.likesPerPoint + " TIM";
  document.querySelector(".ranking-foot").textContent =
    `${g.config.likesPerPoint} tim = 1 điểm · 1 xu = ${g.config.coinPoints} điểm`;
  const signature = JSON.stringify([
    g.rankings,
    g.users.map((p) => [p.id, p.province, p.avatar]),
  ]);
  if (signature !== renderKey && provinces.length) {
    renderKey = signature;
    $("beacons").replaceChildren();
    $("people").replaceChildren();
    const max = Math.max(1, ...g.rankings.map((p) => p.points));
    for (const r of g.rankings) {
      const p = lookup.get(r.id);
      if (!p) continue;
      paths.get(r.id)?.classList.toggle("lit", r.lit);
      if (r.lit) {
        const group = svg("g");
        group.append(
          svg("circle", { cx: p.x, cy: p.y, r: 32, class: "beacon-light" }),
          svg("circle", { cx: p.x, cy: p.y, r: 9, class: "beacon-ring" }),
        );
        const height = 12 + Math.log2(r.points + 1) * 4;
        group.append(
          svg("line", {
            x1: p.x,
            y1: p.y,
            x2: p.x,
            y2: p.y - height,
            class: "beacon-line",
          }),
        );
        const text = svg("text", {
          x: p.x + 10,
          y: p.y - height + 3,
          class: "map-label",
        });
        text.textContent = r.name;
        group.append(text);
        if (r.id === g.rankings[0].id) {
          const crown = svg("text", {
            x: p.x,
            y: p.y - height - 6,
            class: "map-crown",
          });
          crown.textContent = "♛";
          group.append(crown);
        }
        $("beacons").append(group);
      }
    }
    const selected = g.users.filter((p) => p.province).slice(-90),
      counters = new Map();
    let markerIndex = 0;
    for (const p of selected) {
      const region = lookup.get(p.province);
      if (!region) continue;
      const n = counters.get(p.province) || 0;
      counters.set(p.province, n + 1);
      const angle = n * 2.4,
        dist = 8 + Math.sqrt(n) * 13,
        x = region.x + Math.cos(angle) * dist,
        y = region.y + Math.sin(angle) * dist;
      const marker = svg("g", {
        class: "person-marker",
        transform: `translate(${x},${y})`,
      });
      marker.append(svg("circle", { r: 10 }));
      if (p.avatar && /^https?:\/\//.test(p.avatar)) {
        const clip = svg("clipPath", {
          id: "clip-" + ++markerIndex,
        });
        clip.append(svg("circle", { r: 8 }));
        marker.append(clip);
        marker.append(
          svg("image", {
            href: p.avatar,
            x: -8,
            y: -8,
            width: 16,
            height: 16,
            "clip-path": `url(#${clip.id})`,
            preserveAspectRatio: "xMidYMid slice",
          }),
        );
      } else {
        const text = svg("text", { x: 0, y: 0 });
        text.textContent = p.name.slice(0, 1);
        marker.append(text);
      }
      $("people").append(marker);
    }
    $("ranking").replaceChildren();
    for (const [r, p] of g.rankings.slice(0, 10).entries()) {
      const li = document.createElement("li"),
        rank = document.createElement("span"),
        name = document.createElement("span"),
        players = document.createElement("small"),
        score = document.createElement("b"),
        track = document.createElement("span"),
        bar = document.createElement("i");
      rank.className = "rank";
      rank.textContent =
        r === 0 && p.lit ? "♛" : String(r + 1).padStart(2, "0");
      name.className = "rank-name";
      name.textContent = p.name;
      players.textContent = p.players + " người đồng hành";
      name.append(players);
      score.textContent = p.points.toLocaleString("vi-VN");
      track.className = "rank-track";
      bar.style.width = (p.points / max) * 100 + "%";
      track.append(bar);
      li.append(rank, name, score, track);
      $("ranking").append(li);
    }
    const lead = g.rankings[0];
    $("leaderName").textContent = lead.lit
      ? lead.name
      : "Chờ quê bạn lên tiếng";
    $("leaderScore").textContent = lead.lit
      ? `${lead.points.toLocaleString("vi-VN")} điểm · ${lead.players} người đồng hành`
      : "Mỗi lời gọi, một ngọn đèn.";
  }
  $("quizPrompt").textContent = g.quiz.prompt;
  $("quizMeta").textContent =
    `${g.quiz.category} · Câu ${g.quiz.number}/${g.quiz.total}`;
  $("quizReward").textContent =
    g.quiz.phase === "rest"
      ? "Đã hết giờ trả lời · Đang nghỉ 10 giây"
      : `Bình luận đáp án tiếng Việt hoặc số · Đúng +${g.quiz.reward} điểm`;
  $("quizTime").textContent = Math.max(
    0,
    Math.ceil((g.quiz.deadline - (g.paused ? g.pauseAt : g.serverTime)) / 1000),
  );
  $("quizState").textContent =
    g.quiz.phase === "rest" ? "NGHỈ GIỮA CÂU" : "ĐANG TRẢ LỜI";
  document
    .querySelector(".quiz")
    .classList.toggle("resting", g.quiz.phase === "rest");
  $("quizPrevious").textContent = g.quiz.previous
    ? `${g.quiz.phase === "rest" ? "Đáp án" : "Đáp án câu trước"}: ${g.quiz.previous.answer}`
    : "";
  $("previousWinner").textContent = g.lastWinner
    ? `Dẫn đầu ván trước: ${g.lastWinner.name} · ${g.lastWinner.points}đ`
    : "";
  $("chat").replaceChildren();
  for (const e of g.feed
    .filter((x) => x.type === "chat" || x.type === "gift")
    .slice(-3)) {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.append(avatar(e));
    const body = document.createElement("div"),
      name = document.createElement("b"),
      text = document.createElement("div");
    name.textContent = e.name;
    text.className = "message";
    text.textContent = e.text;
    body.append(name, text);
    row.append(body);
    $("chat").append(row);
  }
  if (g.round !== lastRound) {
    rewardVoice.clear();
    lastRound = g.round;
    lastEvent = 0;
  }
  const fresh = provinces.length
    ? g.events.filter((e) => e.id > lastEvent)
    : [];
  if (fresh.length) {
    lastEvent = Math.max(...fresh.map((e) => e.id));
    for (const e of fresh) showEvent(e);
  }
  readQuizSpeech();
  $("connection").textContent =
    m.live.status === "connected"
      ? `● TikTok @${m.live.channel} · ${m.live.comments} bình luận`
      : g.users.some((p) => p.demo)
        ? "● MÔ PHỎNG · Chưa kết nối LIVE"
        : "● TikTok chưa kết nối";
}
setInterval(() => {
  const now = Date.now();
  if (state) {
    const g = state.game,
      remaining = g.paused
        ? g.deadline - g.pauseAt
        : g.deadline - (now + offset);
    $("time").textContent =
      `${String(Math.floor(Math.max(0, remaining) / 60000)).padStart(2, "0")}:${String(Math.floor(Math.max(0, remaining) / 1000) % 60).padStart(2, "0")}`;
    $("quizTime").textContent = Math.max(
      0,
      Math.ceil(
        (g.quiz.deadline - (g.paused ? g.pauseAt : now + offset)) / 1000,
      ),
    );
  }
  if (now > focusUntil && focusId) {
    focusId = "";
    $("camera").style.transform = "";
    $("callout").hidden = true;
  }
  for (const [id, el] of paths) el.classList.toggle("focus", id === focusId);
  if (now > giftUntil) $("giftToast").hidden = true;
  if (now > spotUntil) $("spotlight").hidden = true;
  $("clock").textContent = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}, 200);
$("sound").onclick = async () => {
  if (!music) {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        musicContext = new AudioContextClass();
        await musicContext.resume();
        music = new HomeMusic(musicContext);
        music.start();
        $("musicControls").hidden = false;
      }
    } catch {
      $("connection").textContent =
        "Nhạc chưa bật được; thử bấm lại nút âm thanh";
    }
  } else if (musicContext.state !== "running") await musicContext.resume();
  voice = !voice;
  rewardVoice.setEnabled(voice);
  $("sound").textContent = voice ? "🔊 Giọng đọc: BẬT" : "🔇 Giọng đọc: TẮT";
  spokenQuizKey = "";
  spokenRestKey = "";
  if (voice) readQuizSpeech();
};
const socket = new LiveSocket(
  "overlay",
  (m) => {
    if (m.t === "state") render(m);
  },
  (status) => {
    if (status !== "connected")
      $("connection").textContent = "● Đang nối lại server…";
  },
);
fetch("/api/provinces")
  .then((r) => r.json())
  .then((p) => {
    provinces = p;
    initMap();
  })
  .catch(
    () =>
      ($("connection").textContent = "Không tải được bản đồ — tải lại trang"),
  );

$("musicToggle").onclick = () => {
  if (music)
    $("musicToggle").textContent = music.toggle() ? "♫ Tắt nhạc" : "♫ Bật nhạc";
};
$("musicVolume").oninput = () =>
  music?.setVolume(Number($("musicVolume").value) / 100);
