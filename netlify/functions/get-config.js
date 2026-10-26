const { getStore, connectLambda } = require("@netlify/blobs");

// Public read: the site's settings (names, levels, pour types, locations).
// Returns { config: null } until someone saves Site setup, and the pages use their built-in defaults.
exports.handler = async function (event) {
  connectLambda(event);
  try {
    const store = getStore({ name: "site", consistency: "strong" });
    const config = await store.get("config", { type: "json" }).catch(() => null);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ config: config || null })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
