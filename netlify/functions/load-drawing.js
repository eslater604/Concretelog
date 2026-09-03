const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  const level = event.queryStringParameters && event.queryStringParameters.level;
  if (!level)
    return { statusCode: 400, body: "Missing level parameter" };
  try {
    const store = getStore("drawings");
    const dataUrl = await store.get(`drawing-${level}`, { type: "text" });
    if (!dataUrl)
      return { statusCode: 404, body: JSON.stringify({ error: "No drawing uploaded for this level" }) };
    // Get metadata if available
    const meta = await store.get(`drawing-meta-${level}`, { type: "json" }).catch(()=>null);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        level,
        uploadedAt: meta ? meta.uploadedAt : null,
        sizeKB: meta ? meta.sizeKB : null
      })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
