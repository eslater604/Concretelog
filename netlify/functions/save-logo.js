const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

// Editors upload the site logo (PNG, JPEG, GIF or WebP, up to 250 KB).
function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
const MAX_BYTES = 250 * 1024;

function detectType(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf.slice(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 6 && buf.slice(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (buf.length > 12 && buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event))) return json(401, { error: "Edit password required" });
  try {
    const { dataUrl } = JSON.parse(event.body || "{}");
    const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ""));
    if (!m) return json(400, { error: "That isn't an image file." });
    const bytes = Buffer.from(m[1].replace(/\s/g, ""), "base64");
    if (bytes.length > MAX_BYTES) return json(413, { error: "The logo is over 250 KB. Use a smaller image." });
    const contentType = detectType(bytes);
    if (!contentType) return json(400, { error: "Use a PNG, JPEG, GIF or WebP image." });
    const version = String(Date.now());
    await getStore({ name: "site", consistency: "strong" }).setJSON("logo", { contentType, b64: bytes.toString("base64"), version });
    return json(200, { ok: true, version });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
