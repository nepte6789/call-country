import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Game } from "../src/game.mjs";
import { Bots } from "../src/bots.mjs";
const provinces = JSON.parse(
  fs.readFileSync(new URL("../data/provinces.json", import.meta.url)),
);
function setup(random = () => 0) {
  let now = 1000;
  const game = new Game(provinces, { now: () => now }),
    bots = new Bots(game, { now: () => now, random });
  return { game, bots, advance: (ms) => (now += ms) };
}
test("bot growth adds randomly one or two people each 3 minutes, never early", () => {
  for (const [random, batch] of [
    [() => 0, 1],
    [() => 0.999, 2],
  ]) {
    const { game, bots, advance } = setup(random);
    bots.configure(true, 12);
    assert.equal(game.users.size, 12);
    advance(179999);
    bots.tick();
    assert.equal(game.users.size, 12);
    advance(1);
    bots.tick();
    assert.equal(game.users.size, 12 + batch);
    advance(180000);
    bots.tick();
    assert.equal(game.users.size, 12 + batch * 2);
  }
});
test("growth respects the 100 bot cap, disabling, clearing and real users", () => {
  const { game, bots, advance } = setup(() => 0.999);
  game.comment({ id: "real", name: "Người thật" }, "Hà Tĩnh");
  bots.configure(true, 99);
  advance(180000);
  bots.tick();
  assert.equal(bots.target, 100);
  assert.equal(game.users.size, 101);
  advance(180000);
  bots.tick();
  assert.equal(game.users.size, 101);
  bots.configure(false, 100);
  advance(600000);
  bots.tick();
  assert.equal(game.users.size, 101);
  assert.equal(bots.nextJoinAt, null);
  bots.clear();
  assert.equal(game.users.size, 1);
  assert.ok(game.users.has("real"));
  advance(600000);
  bots.tick();
  assert.equal(game.users.size, 1);
});
test("pausing preserves remaining wait before the next bot batch", () => {
  const { game, bots, advance } = setup();
  bots.configure(true, 12);
  advance(60000);
  game.pause(true);
  advance(600000);
  bots.tick();
  game.pause(false);
  bots.tick();
  assert.equal(game.users.size, 12);
  assert.equal(bots.nextJoinAt - game.now(), 120000);
  advance(120000);
  bots.tick();
  assert.equal(game.users.size, 13);
});
