const { getStore, connectLambda } = require("@netlify/blobs");

// Serves the uploaded site logo (public).
exports.handler = async function (event) {
  connectLambda(event);
  try {
    const logo = await getStore({ name: "site", consistency: "strong" }).get("logo", { type: "json" }).catch(() => null);
    if (!logo || !logo.b64) return { statusCode: 404, body: "No logo uploaded" };
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: { "Content-Type": logo.contentType || "image/png", "Cache-Control": "public, max-age=3600" },
      body: logo.b64
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
