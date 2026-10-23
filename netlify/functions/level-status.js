const { getStore, connectLambda } = require("@netlify/blobs");

// Which levels have been marked "complete" (construction finished) on the
// dashboard. Stored in Netlify Blobs - nothing is written to Smartsheet.
//   GET  -> { completed: { "L1": { completedAt: "..." }, ... } }
//   POST { level: "L1", complete: true|false } -> the updated object

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const store = getStore("levels");
    const load = async () => {
      const data = await store.get("status", { type: "json" }).catch(() => null);
      return data && data.completed ? data : { completed: {} };
    };

    if (event.httpMethod === "GET") return json(200, await load());

    if (event.httpMethod === "POST") {
      const { level, complete } = JSON.parse(event.body || "{}");
      if (typeof level !== "string" || !/^[A-Za-z0-9]{1,8}$/.test(level) || typeof complete !== "boolean") {
        return json(400, { error: "Need a level code (e.g. L1) and complete: true or false" });
      }
      const data = await load();
      if (complete) data.completed[level] = { completedAt: new Date().toISOString() };
      else delete data.completed[level];
      await store.setJSON("status", data);
      return json(200, data);
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
