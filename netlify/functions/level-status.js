const { getStore, connectLambda } = require("@netlify/blobs");

// Which levels have been marked "complete" (construction finished) on the
// dashboard. Stored in Netlify Blobs - nothing is written to Smartsheet.
//   GET  -> { completed: { "L1": { completedAt: "..." }, ... } }
//   POST { level: "L1", complete: true|false } -> the updated object
//
// Each level is its own key, so marking one level never rewrites another, and
// the store uses strong consistency so a change is visible on the very next read
// (Netlify Blobs is otherwise eventually consistent for up to ~60 seconds).

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const store = getStore({ name: "level-completion", consistency: "strong" });
    const loadAll = async () => {
      const { blobs } = await store.list();
      const completed = {};
      await Promise.all(blobs.map(async (b) => {
        const v = await store.get(b.key, { type: "json" }).catch(() => null);
        if (v) completed[b.key] = v;
      }));
      return { completed };
    };

    if (event.httpMethod === "GET") return json(200, await loadAll());

    if (event.httpMethod === "POST") {
      const { level, complete } = JSON.parse(event.body || "{}");
      if (typeof level !== "string" || !/^[A-Za-z0-9]{1,8}$/.test(level) || typeof complete !== "boolean") {
        return json(400, { error: "Need a level code (e.g. L1) and complete: true or false" });
      }
      if (complete) await store.setJSON(level, { completedAt: new Date().toISOString() });
      else await store.delete(level);
      return json(200, await loadAll());
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
