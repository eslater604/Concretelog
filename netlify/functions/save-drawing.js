const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const body = JSON.parse(event.body);
    if (!body.level || !body.dataUrl)
      return { statusCode: 400, body: JSON.stringify({ error: "Missing level or dataUrl" }) };

    const sizeKB = Math.round(Buffer.byteLength(body.dataUrl, 'utf8') / 1024);
    // Netlify Blobs limit is 5MB per value
    if (sizeKB > 4800)
      return { statusCode: 413, body: JSON.stringify({ error: `File too large (${sizeKB}KB). Max ~4800KB.` }) };

    const store = getStore("drawings");
    await store.set(`drawing-${body.level}`, body.dataUrl);
    await store.setJSON(`drawing-meta-${body.level}`, {
      level: body.level,
      fileType: body.fileType || 'image/jpeg',
      uploadedAt: new Date().toISOString(),
      sizeKB
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true, level: body.level, sizeKB }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
