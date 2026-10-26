const { getStore, connectLambda } = require("@netlify/blobs");

// Anyone with the link can post a comment (viewers and editors).
// Each comment is its own record, so two people posting at once never overwrite each other.

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { pourId, name, text } = JSON.parse(event.body || "{}");
    if (typeof pourId !== "string" || !/^(pour-[0-9]{6,20}|area-[A-Za-z0-9-]{3,70})$/.test(pourId))
      return json(400, { error: "Bad pour id" });
    const cleanText = String(text || "").trim().slice(0, 500);
    const cleanName = String(name || "").trim().slice(0, 40) || "Anonymous";
    if (!cleanText) return json(400, { error: "Comment is empty" });

    const store = getStore({ name: "comments", consistency: "strong" });
    const { blobs } = await store.list({ prefix: pourId + "__" });
    if (blobs.length >= 200) return json(429, { error: "This pour has reached the comment limit." });

    const at = new Date().toISOString();
    const key = pourId + "__" + at.replace(/[^0-9]/g, "") + "-" + Math.random().toString(36).slice(2, 7);
    const comment = { key, pourId, name: cleanName, text: cleanText, at };
    await store.setJSON(key, comment);
    return json(200, { ok: true, comment });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
