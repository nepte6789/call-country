// Group rapid gains for one province; camera follows one province at a time.
window.ScoreEffects = class {
  constructor({
    now = Date.now,
    onGain = () => {},
    onFocus = () => {},
    onIdle = () => {},
  } = {}) {
    Object.assign(this, { now, onGain, onFocus, onIdle });
    this.pending = new Map();
    this.active = null;
  }
  get hasWork() {
    return !!this.active || this.pending.size > 0;
  }
  enqueue(event) {
    if (!event.province || !(event.points > 0)) return;
    if (this.active && this.now() >= this.active.until) this.tick();
    this.onGain(event);
    if (this.active?.province === event.province) {
      this.active.points += event.points;
      this.active.name = event.name;
      this.onFocus(this.active, false);
      return;
    }
    const previous = this.pending.get(event.province);
    this.pending.set(event.province, {
      province: event.province,
      name: event.name,
      points: (previous?.points || 0) + event.points,
      at: this.now(),
    });
    if (this.pending.size > 8)
      this.pending.delete(this.pending.keys().next().value);
  }
  tick() {
    const now = this.now();
    if (this.active && now < this.active.until) return;
    const wasActive = !!this.active;
    this.active = null;
    for (const [id, e] of this.pending)
      if (now - e.at > 12000) this.pending.delete(id);
    const next = this.pending.values().next().value;
    if (next) {
      this.pending.delete(next.province);
      this.active = { ...next, until: now + 4200 };
      this.onFocus(this.active, true);
    } else if (wasActive) this.onIdle();
  }
  clear() {
    this.pending.clear();
    this.active = null;
    this.onIdle();
  }
};
