const crypto = require("crypto");

// Accepts the regular edit password or the master override, both read from
// Netlify environment variables (never stored in the code).
function passwordMatches(given) {
  const allowed = [process.env.EDIT_PASSWORD, process.env.EDIT_PASSWORD_MASTER].filter(Boolean);
  const a = Buffer.from(String(given || ""));
  return allowed.some(p => {
    const b = Buffer.from(p);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function authorized(event) {
  return passwordMatches(event.headers && event.headers["x-edit-password"]);
}

const { getStore, connectLambda } = require("@netlify/blobs");

exports.handler = async function(event) {
  connectLambda(event);
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  if (!authorized(event))
    return { statusCode: 401, body: JSON.stringify({ error: "Edit password required" }) };
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
