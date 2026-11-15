import fs from "node:fs";
import { rewardSpeech } from "./reward-text.mjs";
export const normalize = (s) => {
  const text = String(s ?? " ").trim();
  if (/^[+-]?\d+(?:[.,]\d+)?$/.test(text))
    return String(Number(text.replace(",", ".")));
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};
const safeAvatar = (s) =>
  /^https?:\/\//i.test(String(s || "")) ? String(s) : "";
export const QUESTIONS = JSON.parse(
  fs.readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"),
);
export class Game {
  constructor(provinces, { now = Date.now, random = Math.random } = {}) {
    this.provinces = provinces;
    this.now = now;
    this.random = random;
    this.config = {
      minutes: 20,
      likesPerPoint: 10,
      coinPoints: 1,
      followPoints: 5,
      quizSeconds: 20,
      quizRestSeconds: 10,
      quizPoints: 10,
      quizCategory: "mixed",
    };
    this.users = new Map();
    this.round = 1;
    this.paused = false;
    this.deadline = now() + 1200000;
    this.feed = [];
    this.events = [];
    this.serial = 0;
    this.gifts = new Map();
    this.seen = new Map();
    this.quizIndex = 0;
    this.quizCursor = 0;
    this.previousQuiz = null;
    this.quizPhase = "question";
    this.quizDeadline = now() + this.config.quizSeconds * 1000;
    this.lastWinner = null;
    this.aliases = provinces
      .flatMap((p) =>
        [p.name, ...p.aliases].map((a) => ({ text: normalize(a), id: p.id })),
      )
      .sort((a, b) => b.text.length - a.text.length);
  }
  findProvince(text) {
    const clean = " " + normalize(text) + " ";
    return (
      this.aliases.find((a) => clean.includes(" " + a.text + " "))?.id || null
    );
  }
  user(data) {
    if (data?.id === undefined || !String(data.id).trim()) return null;
    const id = String(data.id);
    let p = this.users.get(id);
    if (!p) {
      if (this.users.size >= 5000) return null;
      p = {
        id,
        name: String(data.name || id).slice(0, 60),
        avatar: safeAvatar(data.avatar),
        demo: !!data.demo,
        province: null,
        points: 0,
        pending: 0,
        likes: 0,
        likeRemainder: 0,
        followed: false,
        credits: {},
        visits: [],
        quizAnswered: 0,
      };
      this.users.set(id, p);
    } else {
      p.name = String(data.name || p.name).slice(0, 60);
      if (data.avatar) p.avatar = safeAvatar(data.avatar);
    }
    return p;
  }
  once(id) {
    if (!id) return true;
    id = String(id);
    if (this.seen.has(id)) return false;
    this.seen.set(id, this.now());
    if (this.seen.size > 10000) this.seen.delete(this.seen.keys().next().value);
    return true;
  }
  event(type, p, text, points = 0, details = {}) {
    const e = {
      id: ++this.serial,
      type,
      userId: p?.id || "",
      name: p?.name || "Hệ thống",
      avatar: p?.avatar || "",
      demo: !!p?.demo,
      province: p?.province || null,
      text: String(text).slice(0, 300),
      points,
      at: this.now(),
      ...details,
    };
    this.events.push(e);
    this.feed.push(e);
    if (this.events.length > 40) this.events.shift();
    if (this.feed.length > 50) this.feed.shift();
  }
  award(p, points, type, text, details = {}) {
    points = Math.max(0, Math.min(1000000, Math.floor(points)));
    if (!points) return;
    if (p.province) {
      p.credits[p.province] = (p.credits[p.province] || 0) + points;
      p.points += points;
    } else p.pending += points;
    const province =
      this.provinces.find((v) => v.id === p.province)?.name || "";
    this.event(type, p, text, points, {
      ...details,
      speech: rewardSpeech({
        type,
        name: p.name,
        province,
        points,
        ...details,
      }),
    });
  }
  comment(data, text, eventId) {
    if (this.paused || !this.once(eventId)) return;
    this.tickQuiz();
    const p = this.user(data);
    if (!p) return;
    const q = this.currentQuiz(),
      answerMatches = q.answers.some(
        (a) =>
          normalize(a).replace(/\s+/g, "") ===
          normalize(text).replace(/\s+/g, ""),
      );
    const correct = this.quizPhase === "question" && answerMatches;
    const province =
      answerMatches && p.province ? null : this.findProvince(text);
    if (province) {
      const first = !p.province,
        changed = p.province !== province;
      p.province = province;
      if (!p.visits.includes(province)) p.visits.push(province);
      if (p.pending) {
        const pending = p.pending;
        p.pending = 0;
        this.award(p, pending, "light", "Điểm chờ đã chuyển về quê của bạn");
      }
      if (first) this.award(p, 1, "join", "Thắp ngọn đèn đầu tiên");
      if (changed)
        this.event(
          "visit",
          p,
          "Gọi tên " + this.provinces.find((x) => x.id === province).name,
        );
    }
    if (p.quizAnswered !== this.quizIndex + 1 && correct) {
      p.quizAnswered = this.quizIndex + 1;
      this.award(
        p,
        this.config.quizPoints,
        "quiz",
        `Trả lời đúng câu hỏi · +${this.config.quizPoints} điểm`,
      );
    }
    this.event("chat", p, String(text).slice(0, 250));
  }
  like(data, count, eventId) {
    if (this.paused || !this.once(eventId)) return;
    const p = this.user(data);
    if (!p) return;
    count = Math.max(0, Math.min(100000, Math.floor(Number(count) || 0)));
    p.likes += count;
    const sum = p.likeRemainder + count,
      points = Math.floor(sum / this.config.likesPerPoint);
    p.likeRemainder = sum % this.config.likesPerPoint;
    this.award(p, points, "like", `${count} tim · +${points} điểm`);
  }
  gift(
    data,
    {
      giftId = "gift",
      name = "Quà tặng",
      coins = 1,
      count = 1,
      streakId = "",
      repeatEnd = true,
      eventId,
    } = {},
  ) {
    if (this.paused || !this.once(eventId)) return;
    const p = this.user(data);
    if (!p) return;
    count = Math.max(1, Math.min(100000, Math.floor(Number(count) || 1)));
    coins = Math.max(1, Math.min(100000, Math.floor(Number(coins) || 1)));
    const key = p.id + ":" + giftId + ":" + streakId,
      previous = this.gifts.get(key);
    const fresh =
      !previous ||
      this.now() - previous.at > 30000 ||
      (previous.finished && !repeatEnd && count === 1);
    const delta = fresh ? count : Math.max(0, count - previous.count);
    this.gifts.set(key, {
      count: Math.max(fresh ? 0 : previous.count, count),
      at: this.now(),
      finished: !!repeatEnd,
    });
    if (this.gifts.size > 5000)
      this.gifts.delete(this.gifts.keys().next().value);
    if (delta)
      this.award(
        p,
        delta * coins * this.config.coinPoints,
        "gift",
        `${name} ×${delta} · +${Math.min(1000000, delta * coins * this.config.coinPoints)} điểm`,
        { giftName: String(name).slice(0, 100), giftCount: delta },
      );
  }
  follow(data, eventId) {
    if (this.paused || !this.once(eventId)) return;
    const p = this.user(data);
    if (!p || p.followed) return;
    p.followed = true;
    this.award(p, this.config.followPoints, "follow", "Cảm ơn bạn đã theo dõi");
  }
  rankings() {
    return this.provinces
      .map((v) => {
        let points = 0,
          players = 0,
          visitors = 0;
        for (const u of this.users.values()) {
          points += u.credits[v.id] || 0;
          if (u.province === v.id) players++;
          if (u.visits.includes(v.id)) visitors++;
        }
        return {
          id: v.id,
          name: v.name,
          points,
          players,
          visitors,
          lit: visitors > 0 || points > 0,
        };
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.players - a.players ||
          a.name.localeCompare(b.name, "vi"),
      );
  }
  quizPool() {
    return this.config.quizCategory === "mixed"
      ? QUESTIONS
      : QUESTIONS.filter((q) => q.category === this.config.quizCategory);
  }
  currentQuiz() {
    const pool = this.quizPool();
    return pool[this.quizCursor % pool.length];
  }
  finishQuiz() {
    if (this.quizPhase !== "question") return;
    const q = this.currentQuiz();
    this.previousQuiz = {
      prompt: q.prompt,
      answer: q.answers[0],
      at: this.now(),
    };
    this.quizPhase = "rest";
    this.quizDeadline += this.config.quizRestSeconds * 1000;
  }
  nextQuiz() {
    if (this.quizPhase === "question") {
      const q = this.currentQuiz();
      this.previousQuiz = {
        prompt: q.prompt,
        answer: q.answers[0],
        at: this.now(),
      };
    }
    this.quizCursor++;
    this.quizIndex++;
    this.quizPhase = "question";
    this.quizDeadline =
      (this.paused ? this.pauseAt : this.now()) +
      this.config.quizSeconds * 1000;
  }
  tickQuiz() {
    if (this.paused || this.now() < this.quizDeadline) return;
    if (this.quizPhase === "question") this.finishQuiz();
    if (this.quizPhase === "rest" && this.now() >= this.quizDeadline)
      this.nextQuiz();
  }
  configure(config) {
    const categories = [...new Set(QUESTIONS.map((q) => q.category))];
    for (const [key, min, max] of [
      ["quizSeconds", 10, 180],
      ["quizPoints", 1, 1000],
    ])
      if (config[key] !== undefined) {
        const n = Number(config[key]);
        if (!Number.isInteger(n) || n < min || n > max)
          throw Error(
            "Thời gian câu hỏi phải từ 10–180 giây, điểm thưởng từ 1–1000",
          );
      }
    if (
      config.quizCategory !== undefined &&
      config.quizCategory !== "mixed" &&
      !categories.includes(config.quizCategory)
    )
      throw Error("Chủ đề câu hỏi không tồn tại");
    if (config.quizPoints !== undefined)
      this.config.quizPoints = Number(config.quizPoints);
    const restart =
      (config.quizSeconds !== undefined &&
        Number(config.quizSeconds) !== this.config.quizSeconds) ||
      (config.quizCategory !== undefined &&
        config.quizCategory !== this.config.quizCategory);
    if (config.quizSeconds !== undefined)
      this.config.quizSeconds = Number(config.quizSeconds);
    if (config.quizCategory !== undefined)
      this.config.quizCategory = config.quizCategory;
    if (restart) {
      this.quizCursor = 0;
      this.quizIndex++;
      this.previousQuiz = null;
      this.quizPhase = "question";
      this.quizDeadline =
        (this.paused ? this.pauseAt : this.now()) +
        this.config.quizSeconds * 1000;
    }

    if (config.minutes !== undefined) {
      const v = Number(config.minutes);
      if (!Number.isInteger(v) || v < 1 || v > 60)
        throw Error("Thời gian ván phải từ 1–60 phút");
      this.config.minutes = v;
      this.deadline = (this.paused ? this.pauseAt : this.now()) + v * 60000;
    }
    for (const k of ["likesPerPoint", "coinPoints", "followPoints"])
      if (config[k] !== undefined) {
        const v = Number(config[k]);
        if (!Number.isInteger(v) || v < 1 || v > 1000)
          throw Error("Hệ số điểm phải là số nguyên 1–1000");
        this.config[k] = v;
      }
  }
  pause(on) {
    if (!!on === this.paused) return;
    if (on) this.pauseAt = this.now();
    else {
      const delta = this.now() - this.pauseAt;
      this.deadline += delta;
      this.quizDeadline += delta;
    }
    this.paused = !!on;
  }
  reset() {
    this.round++;
    this.users.clear();
    this.gifts.clear();
    this.seen.clear();
    this.events = [];
    this.feed = [];
    this.deadline = this.now() + this.config.minutes * 60000;
    this.quizPhase = "question";
    this.quizDeadline = this.now() + this.config.quizSeconds * 1000;
    this.quizIndex++;
    this.quizCursor++;
    this.previousQuiz = null;
    if (this.paused) this.pauseAt = this.now();
  }
  clearDemo() {
    for (const [id, u] of this.users) if (u.demo) this.users.delete(id);
    this.events = this.events.filter((e) => !e.demo);
    this.feed = this.feed.filter((e) => !e.demo);
  }
  tick() {
    if (this.paused) return;
    if (this.now() >= this.deadline) {
      const r = this.rankings();
      this.lastWinner = r[0].lit ? { ...r[0], round: this.round } : null;
      this.reset();
    }
    this.tickQuiz();
  }
  snapshot() {
    const rankings = this.rankings(),
      users = [...this.users.values()].map(({ credits, ...p }) => p);
    return {
      round: this.round,
      paused: this.paused,
      pauseAt: this.paused ? this.pauseAt : null,
      deadline: this.deadline,
      serverTime: this.now(),
      config: { ...this.config },
      rankings,
      users,
      lit: rankings.filter((r) => r.lit).length,
      players: users.filter((p) => p.province).length,
      feed: this.feed,
      events: this.events.filter((e) => this.now() - e.at < 6500),
      lastWinner: this.lastWinner,
      quiz: {
        id: this.quizIndex + 1,
        phase: this.quizPhase,
        ...(this.quizPhase === "rest"
          ? { answer: this.currentQuiz().answers[0] }
          : {}),
        questionId: this.currentQuiz().id,
        prompt: this.currentQuiz().prompt,
        category: this.currentQuiz().category,
        number: (this.quizCursor % this.quizPool().length) + 1,
        total: this.quizPool().length,
        reward: this.config.quizPoints,
        previous:
          this.previousQuiz &&
          (this.quizPhase === "rest" ||
            this.now() - this.previousQuiz.at < 8000)
            ? this.previousQuiz
            : null,
        deadline: this.quizDeadline,
      },
    };
  }
}
