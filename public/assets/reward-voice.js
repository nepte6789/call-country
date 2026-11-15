// Serial playback prevents a second reward from interrupting or silently replacing the first.
window.RewardVoice = class {
  constructor({
    onWarning = () => {},
    synth = window.speechSynthesis,
    makeUtterance = (text) => new SpeechSynthesisUtterance(text),
  } = {}) {
    Object.assign(this, { synth, makeUtterance, onWarning });
    this.enabled = false;
    this.items = [];
    this.busy = false;
    this.generation = 0;
    this.timer = null;
    this.synth?.addEventListener?.("voiceschanged", () => this.drain());
  }
  setEnabled(value) {
    this.enabled = !!value;
    if (!this.enabled) this.clear();
    else this.drain();
  }
  clear() {
    this.generation++;
    clearTimeout(this.timer);
    this.items = [];
    this.busy = false;
    this.synth?.cancel();
  }
  enqueue(text, priority = 1) {
    if (!this.enabled || !text) return;
    this.items.push({ text, priority, at: Date.now() });
    if (this.items.length > 30) {
      const low = this.items.findIndex((x) => x.priority === 0);
      this.items.splice(low < 0 ? 0 : low, 1);
    }
    this.drain();
  }
  drain() {
    if (!this.enabled || this.busy || !this.items.length) return;
    if (!this.synth) {
      this.onWarning("Trình duyệt chưa hỗ trợ giọng đọc");
      return;
    }
    const voices = this.synth
        .getVoices()
        .filter((v) => /^vi([-_]|$)/i.test(v.lang)),
      voice = voices.find((v) => /hoai|linh|female/i.test(v.name)) || voices[0];
    if (!voice) {
      this.onWarning("Máy chưa cài giọng tiếng Việt");
      return;
    }
    while (this.items.length && Date.now() - this.items[0].at > 90000)
      this.items.shift();
    if (!this.items.length) return;
    const message = this.items.shift(),
      u = this.makeUtterance(message.text),
      generation = this.generation;
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 1.04;
    u.pitch = 1;
    this.busy = true;
    let done = false;
    const finish = (error) => {
      if (done || generation !== this.generation) return;
      done = true;
      clearTimeout(this.timer);
      this.busy = false;
      if (error)
        this.onWarning(
          "Giọng đọc bị gián đoạn; đang đọc phần thưởng tiếp theo",
        );
      this.drain();
    };
    u.onend = () => finish(false);
    u.onerror = () => finish(true);
    this.timer = setTimeout(() => {
      this.synth.cancel();
      finish(true);
    }, 45000);
    try {
      this.synth.speak(u);
    } catch {
      finish(true);
    }
  }
};
