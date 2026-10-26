const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

// Starting passwords. The edit password can be changed from the pour map
// (the new one is stored hashed in cloud storage and replaces this default).
// The master code is the recovery override and is not changed from the page.
// Either can be overridden with the Netlify variables EDIT_PASSWORD /
// EDIT_PASSWORD_MASTER if you would rather keep them out of the repo.
const DEFAULT_EDIT_PASSWORD = "MarconAdmin";
const DEFAULT_MASTER = "0147";

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function masterCode() {
  return process.env.EDIT_PASSWORD_MASTER || DEFAULT_MASTER;
}

function hashPassword(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 32).toString("hex");
}

async function loadStored() {
  try {
    const store = getStore("auth");
    const data = await store.get("edit-password", { type: "json" });
    return { ok: true, data: data || null };
  } catch (e) {
    return { ok: false, data: null };
  }
}

// Returns "master", "editor", or null
async function checkPassword(given) {
  given = String(given || "");
  if (!given) return null;
  if (safeEqual(given, masterCode())) return "master";
  const stored = await loadStored();
  if (!stored.ok) return null; // storage problem: only the master code works
  if (stored.data) {
    return safeEqual(hashPassword(given, stored.data.salt), stored.data.hash) ? "editor" : null;
  }
  const initial = process.env.EDIT_PASSWORD || DEFAULT_EDIT_PASSWORD;
  return safeEqual(given, initial) ? "editor" : null;
}

async function isAuthorized(event) {
  const given = event.headers && event.headers["x-edit-password"];
  return (await checkPassword(given)) !== null;
}

async function setEditPassword(newPw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const store = getStore("auth");
  await store.setJSON("edit-password", {
    salt,
    hash: hashPassword(newPw, salt),
    changedAt: new Date().toISOString()
  });
}

function masterIs(pw) { return safeEqual(pw, masterCode()); }

module.exports = { checkPassword, isAuthorized, setEditPassword, masterIs };
