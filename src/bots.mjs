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
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.target = 12;
    this.next = 0;
    this.serial = 0;
  }
  configure(on, count = 12) {
    if (!Number.isInteger(Number(count)) || count < 1 || count > 100)
      throw Error("Số người thử từ 1–100");
    this.enabled = !!on;
    this.target = Number(count);
    this.next = 0;
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
      g.comment(p, g.provinces[Math.floor(Math.random() * 34)].name);
      list.push(p);
    }
  }
  tick() {
    const g = this.game;
    if (!this.enabled || g.paused) return;
    this.fill();
    if (Date.now() < this.next) return;
    this.next = Date.now() + 1800 + Math.random() * 3200;
    const list = [...g.users.values()].filter(
      (p) => p.demo && p.id.startsWith("bot-"),
    );
    const p = list[Math.floor(Math.random() * list.length)];
    if (!p) return;
    const chance = Math.random();
    if (chance < 0.65) g.like(p, 10 + Math.floor(Math.random() * 40));
    else if (chance < 0.85)
      g.gift(p, {
        giftId: "demo-" + Date.now(),
        name: "Hoa hồng",
        coins: 1,
        count: 1,
      });
    else g.comment(p, g.provinces[Math.floor(Math.random() * 34)].name);
  }
  clear() {
    this.enabled = false;
    this.game.clearDemo();
  }
}
