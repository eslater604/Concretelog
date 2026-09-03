const { getStore, connectLambda } = require("@netlify/blobs");

exports.handler = async function(event) {
  connectLambda(event);
  try {
    const store = getStore("pours");
    const { blobs } = await store.list();
    const pours = await Promise.all(
      blobs.map(b => store.get(b.key, { type: "json" }))
    );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pours: pours.filter(Boolean) })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
