const crypto = require("crypto");
const { getStore, connectLambda } = require("@netlify/blobs");

function authorized(event) {
  const expected = process.env.EDIT_PASSWORD || "";
  const given = (event.headers && event.headers["x-edit-password"]) || "";
  if (!expected) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.handler = async function(event) {
  connectLambda(event);
  if (event.httpMethod !== "DELETE")
    return { statusCode: 405, body: "Method not allowed" };
  if (!authorized(event))
    return { statusCode: 401, body: JSON.stringify({ error: "Edit password required" }) };
  try {
    const { id } = JSON.parse(event.body);
    if (!id) return { statusCode: 400, body: "Missing id" };
    const store = getStore("pours");
    await store.delete(id);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
