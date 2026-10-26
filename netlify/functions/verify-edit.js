const crypto = require("crypto");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  const expected = process.env.EDIT_PASSWORD || "";
  if (!expected)
    return { statusCode: 500, body: JSON.stringify({ error: "EDIT_PASSWORD is not set on this Netlify site." }) };
  try {
    const { password } = JSON.parse(event.body || "{}");
    const a = Buffer.from(String(password || ""));
    const b = Buffer.from(expected);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { statusCode: ok ? 200 : 401, body: JSON.stringify({ ok }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad request" }) };
  }
};
