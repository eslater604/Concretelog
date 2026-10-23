const { getStore, connectLambda } = require("@netlify/blobs");

// Which levels have been marked "complete" (construction finished) on the
// dashboard. Stored in Netlify Blobs - nothing is written to Smartsheet.
//   GET  -> { completed: { "L1": { completedAt: "..." }, ... } }
//   POST { level: "L1", complete: true|false } -> the updated object
//
// Netlify Blobs is eventually consistent: a NEW key can be read straight away,
// but an overwrite or delete can show the old value for up to ~60 seconds. So
// nothing here is ever overwritten or deleted. Every click appends a new event
// ("L1 complete", "L1 reopened"), and a level's current state is simply its
// most recent event. (Strong consistency is deliberately not used: it needs a
// setting this kind of function is not given.)

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function currentState(events) {
  const latest = {};
  for (const e of events) {
    if (!e || !e.level || !e.at) continue;
    if (!latest[e.level] || e.at > latest[e.level].at) latest[e.level] = e;
  }
  const completed = {};
  for (const [level, e] of Object.entries(latest)) {
    if (e.complete) completed[level] = { completedAt: e.at };
  }
  return { completed };
}

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const store = getStore("level-events");
    const loadEvents = async () => {
      const { blobs } = await store.list();
      const rows = await Promise.all(blobs.map(async (b) => {
        const v = await store.get(b.key, { type: "json" }).catch(() => null);
        return v ? { key: b.key, ...v } : null;
      }));
      return rows.filter(Boolean);
    };

    if (event.httpMethod === "GET") return json(200, currentState(await loadEvents()));

    if (event.httpMethod === "POST") {
      const { level, complete } = JSON.parse(event.body || "{}");
      if (typeof level !== "string" || !/^[A-Za-z0-9]{1,8}$/.test(level) || typeof complete !== "boolean") {
        return json(400, { error: "Need a level code (e.g. L1) and complete: true or false" });
      }
      const at = new Date().toISOString();
      const key = level + "__" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const newEvent = { level, complete, at };
      await store.setJSON(key, newEvent);
      // Include the event just written even if the listing hasn't caught up yet.
      const events = await loadEvents();
      if (!events.some((e) => e.key === key)) events.push({ key, ...newEvent });
      return json(200, currentState(events));
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
