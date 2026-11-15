import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
function setup() {
  const said = [],
    synth = {
      getVoices: () => [{ name: "HoaiMy", lang: "vi-VN" }],
      speak: (u) => said.push(u),
      cancel() {},
      addEventListener() {},
    };
  const ctx = { window: {}, Date, setTimeout, clearTimeout };
  vm.runInNewContext(
    fs.readFileSync(
      new URL("../public/assets/reward-voice.js", import.meta.url),
      "utf8",
    ),
    ctx,
  );
  const q = new ctx.window.RewardVoice({
    synth,
    makeUtterance: (text) => ({ text }),
  });
  q.setEnabled(true);
  return { q, said };
}
test("consecutive rewards are spoken serially instead of being dropped or interrupting", () => {
  const { q, said } = setup();
  q.enqueue("Phần thưởng thứ nhất");
  q.enqueue("Phần thưởng thứ hai");
  assert.equal(said.length, 1);
  assert.equal(said[0].rate, 1.04);
  said[0].onend();
  assert.equal(said.length, 2);
  assert.equal(said[1].text, "Phần thưởng thứ hai");
  said[1].onend();
  q.clear();
});
test("turning speech off clears pending rewards and ignores stale completion callbacks", () => {
  const { q, said } = setup();
  q.enqueue("Một");
  q.enqueue("Hai");
  q.setEnabled(false);
  said[0].onend();
  assert.equal(said.length, 1);
  assert.equal(q.items.length, 0);
});

test("timed questions take priority and resume a reward after the question", () => {
  const { q, said } = setup();
  q.enqueue("Lời cảm ơn");
  q.enqueue("Câu hỏi mới", 2, {
    key: "quiz-1",
    expiresAt: Date.now() + 20000,
    interrupt: true,
  });
  assert.equal(said.length, 2);
  assert.equal(said[1].text, "Câu hỏi mới");
  said[0].onend();
  assert.equal(said.length, 2);
  said[1].onend();
  assert.equal(said[2].text, "Lời cảm ơn");
  said[2].onend();
  q.clear();
});
test("expired or ended quiz speech does not play after the answer window", () => {
  const { q, said } = setup();
  q.enqueue("Câu hết giờ", 2, { key: "old", expiresAt: Date.now() - 1 });
  assert.equal(said.length, 0);
  q.enqueue("Câu đang mở", 2, { key: "new", expiresAt: Date.now() + 20000 });
  q.drop("new");
  assert.equal(q.current, null);
  assert.equal(q.items.length, 0);
  q.clear();
});
