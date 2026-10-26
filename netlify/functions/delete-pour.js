const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

exports.handler = async function(event) {
  connectLambda(event);
  if (event.httpMethod !== "DELETE")
    return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event)))
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
