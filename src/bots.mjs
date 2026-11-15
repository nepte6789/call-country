const names = [
  "Minh Anh",
  "Ngọc Hà",
  "Bảo Trâm",
  "Tuấn Anh",
  "Thanh Mai",
  "Gia Hân",
  "Phúc An",
  "Đức Huy",
  "Thu Hương",
  "Khánh Vy",
  "Quốc Bảo",
  "Thùy Linh",
];
export class Bots {
  constructor(game, { now = Date.now, random = Math.random } = {}) {
    Object.assign(this, { game, now, random });
    this.enabled = false;
    this.target = 12;
    this.next = 0;
    this.serial = 0;
    this.nextGiftAt = 0;
    this.nextJoinAt = null;
    this.pausedAt = null;
  }
  configure(on, count = 12) {
    if (!Number.isInteger(Number(count)) || count < 1 || count > 100)
      throw Error("Số người thử từ 1–100");
    this.enabled = !!on;
    this.target = Number(count);
    this.next = 0;
    this.nextGiftAt = this.now() + 20000;
    this.nextJoinAt = this.enabled ? this.now() + 180000 : null;
    this.pausedAt = this.game.paused ? this.now() : null;
    if (on) {
      const list = [...this.game.users.values()].filter(
        (p) => p.demo && p.id.startsWith("bot-"),
      );
      const ids = new Set(list.slice(this.target).map((p) => p.id));
      for (const id of ids) this.game.users.delete(id);
      this.game.events = this.game.events.filter((e) => !ids.has(e.userId));
      this.game.feed = this.game.feed.filter((e) => !ids.has(e.userId));
      this.fill();
    }
  }
  fill() {
    const g = this.game;
    if (g.paused) return;
    let list = [...g.users.values()].filter(
      (p) => p.demo && p.id.startsWith("bot-"),
    );
    while (list.length < this.target) {
      const n = ++this.serial,
        p = {
          id: "bot-" + n,
          name:
            names[(n - 1) % names.length] +
            (n > 12 ? " " + Math.ceil(n / 12) : ""),
          demo: true,
        };
      g.comment(
        p,
        g.provinces[Math.floor(this.random() * g.provinces.length)].name,
      );
      list.push(p);
    }
  }
  tick() {
    const g = this.game;
    if (!this.enabled) return;
    if (g.paused) {
      this.pausedAt ??= g.pauseAt ?? this.now();
      return;
    }
    if (this.pausedAt !== null) {
      const delta = this.now() - this.pausedAt;
      this.nextJoinAt += delta;
      this.next += delta;
      this.nextGiftAt += delta;
      this.pausedAt = null;
    }
    if (this.nextJoinAt !== null && this.now() >= this.nextJoinAt) {
      this.target = Math.min(
        100,
        this.target + 1 + Math.floor(this.random() * 2),
      );
      this.nextJoinAt = this.now() + 180000;
    }
    this.fill();
    if (this.now() < this.next) return;
    this.next = this.now() + 1800 + this.random() * 3200;
    const list = [...g.users.values()].filter(
      (p) => p.demo && p.id.startsWith("bot-"),
    );
    const p = list[Math.floor(this.random() * list.length)];
    if (!p) return;
    const chance = this.random();
    if (chance < 0.65) g.like(p, 10 + Math.floor(this.random() * 40));
    else if (chance < 0.75 && this.now() >= this.nextGiftAt) {
      this.nextGiftAt = this.now() + 20000;
      g.gift(p, {
        giftId: "demo-" + this.now(),
        name: "Hoa hồng",
        coins: 1,
        count: 1,
      });
    } else
      g.comment(
        p,
        g.provinces[Math.floor(this.random() * g.provinces.length)].name,
      );
  }
  clear() {
    this.enabled = false;
    this.nextJoinAt = null;
    this.pausedAt = null;
    this.game.clearDemo();
  }
}
