const { getStore, connectLambda } = require("@netlify/blobs");

// Notes explaining why a level / category is over or under its estimate.
// Stored in Netlify Blobs - nothing is written to Smartsheet.
//   GET  -> { notes: [ { id, level, category, text, by, at }, ... ] }   (newest first)
//   POST { action: "add", level, category, text, by?, at? } -> { note, notes }
//   POST { action: "delete", id } -> { notes }
//
// Netlify Blobs is eventually consistent (an overwrite or delete can show the old value for
// up to ~60 seconds), so nothing is overwritten: adding a note writes a new record, and
// deleting one writes a small "deleted" record for that note id.

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function build(rows) {
  const deleted = new Set(rows.filter((r) => r.type === "del").map((r) => r.id));
  return rows
    .filter((r) => r.type === "add" && !deleted.has(r.id))
    .map(({ key, type, ...note }) => note)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const store = getStore("level-notes");
    const loadAll = async () => {
      const { blobs } = await store.list();
      const rows = await Promise.all(blobs.map(async (b) => {
        const v = await store.get(b.key, { type: "json" }).catch(() => null);
        return v ? { key: b.key, ...v } : null;
      }));
      return rows.filter(Boolean);
    };

    if (event.httpMethod === "GET") return json(200, { notes: build(await loadAll()) });

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      if (body.action === "add") {
        const level = typeof body.level === "string" ? body.level.trim() : "";
        const category = typeof body.category === "string" ? body.category.trim().slice(0, 60) : "";
        const text = typeof body.text === "string" ? body.text.trim() : "";
        const by = typeof body.by === "string" ? body.by.trim().slice(0, 40) : "";
        if ((level && !/^[A-Za-z0-9]{1,8}$/.test(level)) || !text || text.length > 1000) {
          return json(400, { error: "A note needs text (up to 1000 characters) and a valid level code, or no level for the whole project." });
        }
        // keep the time the note was written on a device that was offline, if it is sensible
        let at = new Date().toISOString();
        if (typeof body.at === "string" && !isNaN(Date.parse(body.at)) && Date.parse(body.at) <= Date.now() + 60000) at = new Date(body.at).toISOString();
        const id = "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        const note = { id, level, category, text, by, at };
        await store.setJSON(id, { type: "add", ...note });
        const rows = await loadAll();
        if (!rows.some((r) => r.key === id)) rows.push({ key: id, type: "add", ...note });   // listing may lag
        return json(200, { note, notes: build(rows) });
      }

      if (body.action === "delete") {
        const id = typeof body.id === "string" ? body.id : "";
        if (!/^[A-Za-z0-9_-]{1,60}$/.test(id)) return json(400, { error: "Need the id of the note to delete." });
        const key = "d_" + id;
        await store.setJSON(key, { type: "del", id, at: new Date().toISOString() });
        const rows = await loadAll();
        if (!rows.some((r) => r.key === key)) rows.push({ key, type: "del", id });
        return json(200, { notes: build(rows) });
      }

      return json(400, { error: "Unknown action." });
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
