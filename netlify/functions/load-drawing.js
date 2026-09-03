const { getStore, connectLambda } = require("@netlify/blobs");

exports.handler = async function(event) {
  connectLambda(event);
  const level = event.queryStringParameters && event.queryStringParameters.level;
  if (!level)
    return { statusCode: 400, body: "Missing level parameter" };
  try {
    const store = getStore("drawings");
    const dataUrl = await store.get(`drawing-${level}`, { type: "text" });
    if (!dataUrl)
      return { statusCode: 404, body: JSON.stringify({ error: "No drawing for this level" }) };
    const meta = await store.get(`drawing-meta-${level}`, { type: "json" }).catch(()=>null);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl, level,
        fileType: meta ? meta.fileType : "application/pdf",
        uploadedAt: meta ? meta.uploadedAt : null
      })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
