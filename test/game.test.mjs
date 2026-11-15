import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Game } from "../src/game.mjs";
import { resolveLiveUser } from "../src/live-user.mjs";
import { channelName } from "../src/auto-connect.mjs";
const provinces = JSON.parse(
  fs.readFileSync(new URL("../data/provinces.json", import.meta.url)),
);
const user = (id, demo = false) => ({ id, name: "Bạn " + id, demo });
function fixture() {
  let time = 1000;
  const g = new Game(provinces, { now: () => time });
  return { g, advance: (ms) => (time += ms) };
}
test("34 merged regions have finite geometry and accept historical names", () => {
  const { g } = fixture();
  assert.equal(provinces.length, 34);
  assert.equal(new Set(provinces.map((p) => p.id)).size, 34);
  for (const p of provinces) {
    assert.ok(p.path.startsWith("M"));
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.equal(g.findProvince(p.name), p.id);
  }
  for (const [old, current] of [
    ["Bình Định", "Gia Lai"],
    ["Bến Tre", "Vĩnh Long"],
    ["Hải Dương", "Hải Phòng"],
    ["Sài Gòn", "TP. Hồ Chí Minh"],
    ["Bắc Kạn", "Thái Nguyên"],
  ])
    assert.equal(g.findProvince("quê mình " + old), g.findProvince(current));
  assert.equal(g.findProvince("Không tìm được quê"), null);
});
test("first comment lights province once, repeat comments do not inflate points, changing home retains earned credits", () => {
  const { g } = fixture();
  const p = user("1");
  g.comment(p, "Hà Tĩnh");
  g.comment(p, "Ha Tinh");
  assert.equal(g.users.get("1").points, 1);
  g.like(p, 100);
  g.comment(p, "Nghệ An");
  assert.equal(g.rankings().find((p) => p.name === "Hà Tĩnh").points, 11);
  assert.equal(g.users.get("1").province, g.findProvince("Nghệ An"));
  assert.equal(g.snapshot().lit, 2);
});
test("likes carry remainder and points received before selection are held and transferred", () => {
  const { g } = fixture();
  g.like(user("1"), 6);
  g.like(user("1"), 6);
  assert.equal(g.users.get("1").pending, 1);
  assert.equal(g.users.get("1").likeRemainder, 2);
  g.gift(user("1"), { coins: 10, count: 2 });
  g.comment(user("1"), "Nghệ An");
  assert.equal(g.users.get("1").points, 22);
  assert.equal(g.users.get("1").pending, 0);
});
test("gift streak progress and end are delta-counted, duplicate event IDs ignored", () => {
  const { g } = fixture();
  const p = user("1");
  g.comment(p, "Đà Nẵng");
  g.gift(p, { coins: 2, count: 1, repeatEnd: false, eventId: "gift1" });
  g.gift(p, { coins: 2, count: 3, repeatEnd: false, eventId: "gift2" });
  g.gift(p, { coins: 2, count: 3, repeatEnd: true, eventId: "gift3" });
  g.gift(p, { coins: 2, count: 3, repeatEnd: true, eventId: "gift3" });
  assert.equal(g.users.get("1").points, 7);
  g.gift(p, { coins: 2, count: 1, repeatEnd: false, eventId: "next" });
  assert.equal(g.users.get("1").points, 9);
});
test("ordinary separate gifts score independently and follows score once per round", () => {
  const { g } = fixture();
  const p = user("1");
  g.comment(p, "Hà Tĩnh");
  g.gift(p, { streakId: "standalone1" });
  g.gift(p, { streakId: "standalone2" });
  g.follow(p);
  g.follow(p);
  assert.equal(g.users.get("1").points, 8);
});
test("quiz awards at most once per viewer per question", () => {
  const { g } = fixture();
  g.comment(user("1"), "Hà Nội");
  assert.equal(g.users.get("1").points, 11);
  g.comment(user("1"), "Hà Nội");
  assert.equal(g.users.get("1").points, 11);
});
test("pause freezes timer and ignores interactions; reset keeps config and winner", () => {
  const { g, advance } = fixture();
  g.comment(user("1"), "Đà Nẵng");
  g.configure({ minutes: 1 });
  g.pause(true);
  advance(90000);
  g.like(user("1"), 100);
  g.tick();
  assert.equal(g.round, 1);
  assert.equal(g.users.get("1").points, 1);
  g.pause(false);
  assert.equal(g.deadline - g.now(), 60000);
  advance(60000);
  g.tick();
  assert.equal(g.round, 2);
  assert.equal(g.lastWinner.name, "Đà Nẵng");
  assert.equal(g.users.size, 0);
  assert.equal(g.config.minutes, 1);
  assert.throws(() => g.configure({ likesPerPoint: 0 }));
});
test("clearing demo users subtracts only their regional contributions", () => {
  const { g } = fixture();
  g.comment(user("real"), "Đà Nẵng");
  g.like(user("real"), 100);
  g.comment(user("bot", true), "Đà Nẵng");
  g.like(user("bot", true), 200);
  assert.equal(g.rankings()[0].points, 32);
  g.clearDemo();
  assert.equal(g.rankings()[0].points, 11);
  assert.equal(g.snapshot().players, 1);
  assert.ok(g.snapshot().feed.every((e) => !e.demo));
});
test("nested users and aliases normalize, channel validation and event deduplication work", () => {
  const aliases = new Map(),
    p = resolveLiveUser(
      {
        user: {
          uniqueId: "abc",
          userId: "123",
          nickname: "Tên",
          avatarThumb: { urlList: ["https://a.test/img"] },
        },
      },
      aliases,
    );
  assert.equal(p.name, "Tên");
  assert.equal(resolveLiveUser({ user: { userId: "123" } }, aliases).id, p.id);
  assert.equal(channelName("https://www.tiktok.com/@abc/live"), "abc");
  assert.throws(() => channelName("https://evil.test/@abc"));
  const { g } = fixture();
  g.comment(user("1"), "Đà Nẵng");
  g.like(user("1"), 100, "id");
  g.like(user("1"), 100, "id");
  assert.equal(g.users.get("1").points, 11);
});
