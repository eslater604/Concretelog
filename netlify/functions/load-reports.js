const { getStore, connectLambda } = require("@netlify/blobs");

// Public read: everyone (viewers too) sees the report numbers on the pour cards.
exports.handler = async function (event) {
  connectLambda(event);
  try {
    const store = getStore({ name: "test-reports", consistency: "strong" });
    const { blobs } = await store.list();
    const items = await Promise.all(blobs.map(b => store.get(b.key, { type: "json" }).catch(() => null)));
    const reports = items.filter(Boolean).sort((a, b) => (a.date === b.date ? (a.number < b.number ? -1 : 1) : (a.date < b.date ? 1 : -1)));
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reports }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
