const { getStore } = require("@netlify/blobs");

exports.handler = async function(event) {
  const level = event.queryStringParameters && event.queryStringParameters.level;
  if (!level)
    return { statusCode: 400, body: "Missing level parameter" };
  try {
    const store = getStore("drawings");
    const drawing = await store.get(`drawing-${level}`, { type: "json" });
    if (!drawing)
      return { statusCode: 404, body: JSON.stringify({ error: "No drawing uploaded for this level" }) };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(drawing)
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
