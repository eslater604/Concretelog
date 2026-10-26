const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

// Editors add a lab testing report: a report number and the date it belongs to.
// Pours are matched to reports by date on the pour map.

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event))) return json(401, { error: "Edit password required" });
  try {
    const body = JSON.parse(event.body || "{}");
    const number = String(body.number || "").trim();
    const date = String(body.date || "").trim();
    if (!number) return json(400, { error: "Enter a report number." });
    if (number.length > 40) return json(400, { error: "Report number is too long (max 40 characters)." });
    if (!/^[\w #./\\-]+$/.test(number)) return json(400, { error: "Report number has characters that aren't allowed." });
    if (!validDate(date)) return json(400, { error: "Enter a valid date." });

    const slug = number.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    if (!slug) return json(400, { error: "Report number needs letters or digits." });
    const key = date + "__" + slug;

    const store = getStore({ name: "test-reports", consistency: "strong" });
    if (await store.get(key, { type: "json" }).catch(() => null))
      return json(409, { error: "That report number is already added for this date." });

    const report = { key, number, date, addedAt: new Date().toISOString() };
    await store.setJSON(key, report);
    return json(200, { ok: true, report });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
