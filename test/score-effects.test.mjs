import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
function setup() {
  let now = 1000;
  const gains = [],
    focus = [],
    idle = [];
  const ctx = { window: {}, Date };
  vm.runInNewContext(
    fs.readFileSync(
      new URL("../public/assets/score-effects.js", import.meta.url),
      "utf8",
    ),
    ctx,
  );
  const fx = new ctx.window.ScoreEffects({
    now: () => now,
    onGain: (e) => gains.push(e),
    onFocus: (e, enter) => focus.push({ ...e, enter }),
    onIdle: () => idle.push(true),
  });
  return { fx, gains, focus, idle, advance: (ms) => (now += ms) };
}
test("point effects apply to all award kinds but not welcomes or pending unassigned gifts", () => {
  const { fx, gains } = setup();
  for (const type of ["like", "gift", "quiz", "follow", "join", "light"])
    fx.enqueue({ type, province: "ha-noi", points: 10 });
  fx.enqueue({ type: "welcome", province: null, points: 0 });
  fx.enqueue({ type: "gift", province: null, points: 10 });
  fx.enqueue({ type: "chat", province: "ha-noi", points: 0 });
  assert.equal(gains.length, 6);
  assert.equal(fx.pending.size, 1);
  fx.tick();
  assert.equal(fx.active.points, 60);
});
test("rapid gains merge without repeated zoom and other provinces get separate turns", () => {
  const { fx, focus, idle, advance } = setup();
  fx.enqueue({ province: "a", points: 3 });
  fx.enqueue({ province: "a", points: 7 });
  fx.tick();
  assert.equal(fx.active.points, 10);
  assert.equal(focus.length, 1);
  fx.enqueue({ province: "a", points: 5 });
  assert.equal(focus.at(-1).enter, false);
  assert.equal(fx.active.points, 15);
  fx.enqueue({ province: "b", points: 4 });
  advance(4199);
  fx.tick();
  assert.equal(fx.active.province, "a");
  advance(1);
  fx.tick();
  assert.equal(fx.active.province, "b");
  advance(4200);
  fx.tick();
  assert.equal(fx.active, null);
  assert.equal(idle.length, 1);
});
test("old or excessive pending camera effects expire and reset clears active effects", () => {
  const { fx, advance } = setup();
  for (let i = 0; i < 30; i++) fx.enqueue({ province: String(i), points: 1 });
  assert.equal(fx.pending.size, 8);
  advance(12001);
  fx.tick();
  assert.equal(fx.active, null);
  assert.equal(fx.pending.size, 0);
  fx.enqueue({ province: "fresh", points: 1 });
  fx.tick();
  assert.ok(fx.active);
  fx.clear();
  assert.equal(fx.hasWork, false);
});
