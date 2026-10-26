const { getStore, connectLambda } = require("@netlify/blobs");

// Opens a saved report PDF in the browser. Anyone with the link can open it (viewers too).
exports.handler = async function (event) {
  connectLambda(event);
  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}__[a-z0-9-]{1,60}$/.test(key))
    return { statusCode: 400, body: "Bad report key" };
  try {
    const files = getStore({ name: "test-report-files", consistency: "strong" });
    const b64 = await files.get(key, { type: "text" });
    if (!b64) return { statusCode: 404, body: "No PDF stored for this report" };
    const meta = await getStore({ name: "test-reports", consistency: "strong" }).get(key, { type: "json" }).catch(() => null);
    const name = ((meta && meta.fileName) || "report.pdf").replace(/[^\w .()#&+-]/g, "_");
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="' + name + '"',
        "Cache-Control": "private, max-age=300"
      },
      body: b64
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
