const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const body = JSON.parse(event.body);
    // body: { level: "P2", dataUrl: "data:image/png;base64,..." }
    if (!body.level || !body.dataUrl)
      return { statusCode: 400, body: "Missing level or dataUrl" };
    const store = getStore("drawings");
    await store.setJSON(`drawing-${body.level}`, {
      level: body.level,
      dataUrl: body.dataUrl,
      uploadedAt: new Date().toISOString()
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true, level: body.level }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
