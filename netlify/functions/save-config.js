const { getStore, connectLambda } = require("@netlify/blobs");
const { isAuthorized } = require("./lib/auth");

// Editors save the site's settings. Everything is checked and rebuilt here,
// so only valid values are ever stored.

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

function sanitize(c) {
  const b = c.branding || {};
  const branding = {
    company: str(b.company, 80),
    project: str(b.project, 80),
    mapTitle: str(b.mapTitle, 40) || "Pour Map",
    dashboardTitle: str(b.dashboardTitle, 40) || "Concrete Dashboard",
    primary: HEX.test(b.primary || "") ? b.primary : "#B3261E",
    accent: HEX.test(b.accent || "") ? b.accent : "#E1601C",
    logoMode: ["default", "custom", "text"].includes(b.logoMode) ? b.logoMode : "default",
    logoVersion: str(b.logoVersion, 40)
  };
  if (!branding.company) throw new Error("Enter a company name.");
  if (!branding.project) throw new Error("Enter a project name.");

  if (!Array.isArray(c.levels) || c.levels.length < 1 || c.levels.length > 80) throw new Error("Add between 1 and 80 levels.");
  const seen = new Set();
  const levels = c.levels.map(l => {
    const code = str(l && l.code, 8);
    if (!/^[A-Za-z0-9]{1,8}$/.test(code)) throw new Error('Level code "' + code + '" must be 1-8 letters or digits.');
    if (seen.has(code.toLowerCase())) throw new Error('Level code "' + code + '" is used twice.');
    seen.add(code.toLowerCase());
    const dash = str(l.dash, 8);
    if (dash && !/^[A-Za-z0-9]{1,8}$/.test(dash)) throw new Error('Dashboard code "' + dash + '" must be 1-8 letters or digits.');
    const fallback = str(l.fallback, 60);
    return { code, name: str(l.name, 50) || "Level " + code, dash, fallback: /^[\w.-]{1,60}$/.test(fallback) ? fallback : "" };
  });

  if (!Array.isArray(c.pourTypes) || c.pourTypes.length < 1 || c.pourTypes.length > 20) throw new Error("Add between 1 and 20 pour types.");
  const tnames = new Set();
  const pourTypes = c.pourTypes.map(t => {
    const name = str(t && t.name, 30);
    if (!name) throw new Error("Every pour type needs a name.");
    if (tnames.has(name.toLowerCase())) throw new Error('Pour type "' + name + '" is used twice.');
    tnames.add(name.toLowerCase());
    return { name, color: HEX.test((t && t.color) || "") ? t.color : "#999999" };
  });
  const typeSet = new Set(pourTypes.map(t => t.name));

  const locations = {};
  const entries = Object.entries(c.locations && typeof c.locations === "object" ? c.locations : {});
  if (entries.length > 100) throw new Error("Too many locations (max 100).");
  for (const [k, v] of entries) {
    const name = str(k, 100);
    if (!name) throw new Error("A location has no name.");
    if (!typeSet.has(String(v))) throw new Error('Location "' + name + '" is set to a pour type that doesn\'t exist.');
    locations[name] = String(v);
  }
  return { version: 1, branding, levels, pourTypes, locations };
}

exports.handler = async function (event) {
  connectLambda(event);
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!(await isAuthorized(event))) return json(401, { error: "Edit password required" });
  try {
    const body = JSON.parse(event.body || "{}");
    let config;
    try { config = sanitize(body.config || {}); }
    catch (e) { return json(400, { error: e.message }); }
    config.updatedAt = new Date().toISOString();
    await getStore({ name: "site", consistency: "strong" }).setJSON("config", config);
    return json(200, { ok: true, config });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
