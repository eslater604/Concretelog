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

exports.handler = async function(event) {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  if (!process.env.EDIT_PASSWORD && !process.env.EDIT_PASSWORD_MASTER)
    return { statusCode: 500, body: JSON.stringify({ error: "No edit password is set on this Netlify site." }) };
  try {
    const { password } = JSON.parse(event.body || "{}");
    const ok = passwordMatches(password);
    // Small delay on a wrong guess to slow down repeated attempts
    if (!ok) await new Promise(r => setTimeout(r, 800));
    return { statusCode: ok ? 200 : 401, body: JSON.stringify({ ok }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad request" }) };
  }
};
