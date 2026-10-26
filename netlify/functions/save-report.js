const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

// Editors add a lab testing report: a PDF (read in the browser) or just a number + date.
// Pours are matched to reports by date on the pour map.

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

const KINDS = { placement: "cpr", strength: "csr", other: "rpt", manual: "" };
const MAX_PDF_BYTES = 3 * 1024 * 1024;

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const numOrNull = (v, lo, hi) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isFinite(n) && n >= lo && n <= hi ? n : null;
};

exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event))) return json(401, { error: "Edit password required" });
  try {
    const b = JSON.parse(event.body || "{}");
    const hasFile = typeof b.fileBase64 === "string" && b.fileBase64.length > 0;
    const kind = Object.prototype.hasOwnProperty.call(KINDS, b.kind) ? b.kind : (hasFile ? "other" : "manual");

    const number = clip(b.number, 40);
    const date = clip(b.date, 10);
    if (!number) return json(400, { error: "Enter a report number." });
    if (!/^[\w #./\\-]+$/.test(number)) return json(400, { error: "Report number has characters that aren't allowed." });
    if (!validDate(date)) return json(400, { error: "Enter a valid date." });

    const ageDays = numOrNull(b.ageDays, 0, 400);
    const slugNum = number.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slugNum) return json(400, { error: "Report number needs letters or digits." });
    const slug = [KINDS[kind], slugNum, kind === "strength" && ageDays ? ageDays + "d" : ""]
      .filter(Boolean).join("-").slice(0, 60);
    const key = date + "__" + slug;

    const store = getStore({ name: "test-reports", consistency: "strong" });
    if (await store.get(key, { type: "json" }).catch(() => null))
      return json(409, { error: "That report is already added for this date." });

    let fileName = "";
    if (hasFile) {
      const bytes = Buffer.from(b.fileBase64, "base64");
      if (bytes.length > MAX_PDF_BYTES) return json(413, { error: "That PDF is over 3 MB." });
      if (bytes.slice(0, 4).toString("latin1") !== "%PDF") return json(400, { error: "That file isn't a PDF." });
      fileName = clip(b.fileName, 120).replace(/[^\w .()#&+-]/g, "_") || "report.pdf";
      const files = getStore({ name: "test-report-files", consistency: "strong" });
      await files.set(key, b.fileBase64);
    }

    const report = {
      key, kind, number, date,
      setNo: clip(b.setNo, 20), mix: clip(b.mix, 30), location: clip(b.location, 60), jobNo: clip(b.jobNo, 30),
      ageDays, mpa: numOrNull(b.mpa, 0, 200), pctSpec: numOrNull(b.pctSpec, 0, 300),
      fileName, hasFile, addedAt: new Date().toISOString()
    };
    await store.setJSON(key, report);
    return json(200, { ok: true, report });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
