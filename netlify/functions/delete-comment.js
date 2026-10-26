const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

// Only editors (edit password) can delete a comment.
exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "DELETE") return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event)))
    return { statusCode: 401, body: JSON.stringify({ error: "Edit password required" }) };
  try {
    const { key } = JSON.parse(event.body || "{}");
    if (typeof key !== "string" || !/^(pour-[0-9]{6,20}|area-[A-Za-z0-9-]{3,70})__[0-9]{10,20}-[a-z0-9]{1,8}$/.test(key))
      return { statusCode: 400, body: JSON.stringify({ error: "Bad comment key" }) };
    const store = getStore({ name: "comments", consistency: "strong" });
    await store.delete(key);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
