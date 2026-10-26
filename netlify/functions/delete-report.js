const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "DELETE") return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event)))
    return { statusCode: 401, body: JSON.stringify({ error: "Edit password required" }) };
  try {
    const { key } = JSON.parse(event.body || "{}");
    if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}__[a-z0-9-]{1,60}$/.test(key))
      return { statusCode: 400, body: JSON.stringify({ error: "Bad report key" }) };
    await getStore({ name: "test-reports", consistency: "strong" }).delete(key);
    await getStore({ name: "test-report-files", consistency: "strong" }).delete(key).catch(() => {});
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
