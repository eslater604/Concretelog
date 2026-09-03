const { getStore, connectLambda } = require("@netlify/blobs");

exports.handler = async function(event) {
  connectLambda(event);
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const { level, dataUrl, fileType } = JSON.parse(event.body);
    if (!level || !dataUrl)
      return { statusCode: 400, body: JSON.stringify({ error: "Missing level or dataUrl" }) };
    const sizeKB = Math.round(event.body.length / 1024);
    const store = getStore("drawings");
    await store.set(`drawing-${level}`, dataUrl);
    await store.setJSON(`drawing-meta-${level}`, {
      level, fileType: fileType || "application/pdf",
      uploadedAt: new Date().toISOString(), sizeKB
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true, level, sizeKB }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
