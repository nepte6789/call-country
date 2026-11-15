const clean = (s) =>
  String(s || "")
    .replace(/[@_\p{Extended_Pictographic}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
export function giftPhrase(name, count) {
  const text = clean(name) || "quà tặng";
  if (/^(quà tặng|qua tang|gift)$/i.test(text)) return `${count} món quà`;
  if (/hoa hồng|hoa hong|rose/i.test(text)) return `${count} bông hoa hồng`;
  if (/trái tim|trai tim|heart/i.test(text)) return `${count} trái tim`;
  return `${count} món quà ${text}`;
}
export function rewardSpeech({
  type,
  name,
  province,
  points,
  giftName,
  giftCount,
}) {
  const who = clean(name) || "người bạn",
    home = clean(province);
  const result = home
    ? `Quê ${home} được cộng thêm ${points} điểm.`
    : `Bạn nhận được ${points} điểm thưởng. Hãy bình luận tên quê để chuyển điểm về quê mình nhé.`;
  if (type === "gift")
    return `Cảm ơn ${who} đã tặng ${giftPhrase(giftName, giftCount)}. ${result}`;
  if (type === "quiz")
    return `Chúc mừng ${who} đã trả lời đúng câu hỏi. ${result}`;
  if (type === "follow") return `Cảm ơn ${who} đã theo dõi kênh. ${result}`;
  if (type === "light")
    return `${who} ơi, ${points} điểm đang chờ đã được chuyển về quê ${home}.`;
  return "";
}
