// save-drawing v3 - raw PDF bytes via base64 dataUrl
const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const body = JSON.parse(event.body);
    const { level, dataUrl, fileType } = body;

    if (!level || !dataUrl)
      return { statusCode: 400, body: JSON.stringify({ error: "Missing level or dataUrl" }) };

    const sizeKB = Math.round(event.body.length / 1024);

    const store = getStore("drawings");
    await store.set(`drawing-${level}`, dataUrl);
    await store.setJSON(`drawing-meta-${level}`, {
      level,
      fileType: fileType || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      sizeKB
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, level, sizeKB, version: 3 })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e), version: 3 }) };
  }
};
