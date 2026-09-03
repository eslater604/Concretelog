const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const pour = JSON.parse(event.body);
    if (!pour.id) return { statusCode: 400, body: "Missing pour id" };
    const store = getStore("pours");
    await store.setJSON(pour.id, pour);
    return { statusCode: 200, body: JSON.stringify({ ok: true, id: pour.id }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
