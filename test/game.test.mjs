import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Game, QUESTIONS, normalize } from "../src/game.mjs";
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

test("simple quiz bank has 60 unique questions across six topics, with Vietnamese or numeric answers", () => {
  assert.equal(QUESTIONS.length, 60);
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, 60);
  assert.equal(new Set(QUESTIONS.map((q) => q.prompt)).size, 60);
  assert.equal(new Set(QUESTIONS.map((q) => q.category)).size, 6);
  assert.ok(
    QUESTIONS.every(
      (q) =>
        q.answers.length &&
        q.answers.every((a) => typeof a === "string" && a.trim()),
    ),
  );
});
test("quiz accepts numeric and accentless Vietnamese answers without ABC choices", () => {
  const { g } = fixture();
  g.comment(user("1"), "Hà Tĩnh");
  g.configure({ quizCategory: "Toán nhẩm" });
  g.comment(user("1"), "5");
  assert.equal(g.users.get("1").points, 11);
  g.comment(user("1"), "5");
  assert.equal(g.users.get("1").points, 11);
  g.nextQuiz();
  g.comment(user("1"), "sau");
  assert.equal(g.users.get("1").points, 21);
  assert.notEqual(normalize("-5"), normalize("5"));
  assert.notEqual(normalize("1.5"), normalize("15"));
});
test("correct province-name answer credits chosen home instead of switching province", () => {
  const { g } = fixture();
  g.comment(user("1"), "Hà Tĩnh");
  g.comment(user("1"), "ha noi");
  assert.equal(g.users.get("1").province, g.findProvince("Hà Tĩnh"));
  assert.equal(g.rankings().find((p) => p.name === "Hà Tĩnh").points, 11);
  g.comment(user("1"), "quê tôi Hà Nội");
  assert.equal(g.users.get("1").province, g.findProvince("Hà Nội"));
});
test("quiz settings, previous answer reveal and deadline guard work", () => {
  const { g, advance } = fixture();
  g.configure({ quizSeconds: 10, quizPoints: 20, quizCategory: "Toán nhẩm" });
  assert.equal(g.snapshot().quiz.reward, 20);
  assert.equal(g.quizDeadline - g.now(), 10000);
  g.comment(user("1"), "5");
  assert.equal(g.users.get("1").pending, 20);
  advance(10000);
  g.comment(user("1"), "5");
  assert.equal(g.users.get("1").pending, 20);
  assert.equal(g.snapshot().quiz.previous.answer, "5");
  assert.equal(g.snapshot().quiz.phase, "rest");
  assert.equal(g.snapshot().quiz.answer, "5");
  assert.equal(g.snapshot().quiz.prompt, "2 + 3 = bao nhiêu?");
  advance(10000);
  g.tick();
  assert.equal(g.snapshot().quiz.prompt, "10 - 4 = bao nhiêu?");
  assert.equal(g.snapshot().quiz.answer, undefined);
  assert.throws(() => g.configure({ quizCategory: "invalid" }));
  assert.throws(() => g.configure({ quizSeconds: 1 }));
});
test("reward speech names the actual gift, quantity, score and province without display symbols", () => {
  const { g } = fixture();
  g.comment(user("1"), "Gia Lai");
  g.gift(user("1"), { name: "Rose", count: 10 });
  const e = g.events.at(-1);
  assert.equal(e.giftCount, 10);
  assert.match(e.speech, /10 bông hoa hồng/);
  assert.match(e.speech, /Quê Gia Lai được cộng thêm 10 điểm/);
  assert.doesNotMatch(e.speech, /[×+·]/);
  g.follow(user("pending"));
  assert.match(g.events.at(-1).speech, /Hãy bình luận tên quê/);
});

test("20 second answer window is followed by a 10 second rest with no quiz scoring", () => {
  const { g, advance } = fixture();
  g.configure({ quizCategory: "Toán nhẩm" });
  assert.equal(g.quizDeadline - g.now(), 20000);
  assert.equal(g.snapshot().quiz.answer, undefined);
  advance(19999);
  g.comment(user("early"), "5");
  assert.equal(g.users.get("early").pending, 10);
  advance(1);
  g.comment(user("late"), "5");
  assert.equal(g.quizPhase, "rest");
  assert.equal(g.users.get("late").pending, 0);
  assert.equal(g.quizDeadline - g.now(), 10000);
  assert.equal(g.snapshot().quiz.answer, "5");
  advance(9999);
  g.comment(user("late"), "5");
  assert.equal(g.users.get("late").pending, 0);
  assert.equal(g.quizPhase, "rest");
  advance(1);
  g.tick();
  assert.equal(g.quizPhase, "question");
  assert.equal(g.snapshot().quiz.number, 2);
  assert.equal(g.quizDeadline - g.now(), 20000);
  assert.equal(g.snapshot().quiz.answer, undefined);
});
test("global pause freezes the quiz rest countdown and does not skip the next question", () => {
  const { g, advance } = fixture();
  advance(20000);
  g.tick();
  assert.equal(g.quizPhase, "rest");
  advance(3000);
  g.pause(true);
  advance(90000);
  g.tick();
  assert.equal(g.quizPhase, "rest");
  g.pause(false);
  assert.equal(g.quizDeadline - g.now(), 7000);
  advance(7000);
  g.tick();
  assert.equal(g.quizPhase, "question");
  assert.equal(g.quizIndex, 1);
});
