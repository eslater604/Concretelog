const { connectLambda } = require("@netlify/blobs");
const { checkPassword, setEditPassword, masterIs } = require("./lib/auth");

exports.handler = async function(event) {
  connectLambda(event);
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const { currentPassword, newPassword } = JSON.parse(event.body || "{}");
    const role = await checkPassword(currentPassword);
    if (!role) {
      await new Promise(r => setTimeout(r, 800));
      return { statusCode: 401, body: JSON.stringify({ error: "Current password is incorrect." }) };
    }
    if (!newPassword || String(newPassword).length < 8)
      return { statusCode: 400, body: JSON.stringify({ error: "New password must be at least 8 characters." }) };
    if (masterIs(newPassword))
      return { statusCode: 400, body: JSON.stringify({ error: "New password can't be the same as the master code." }) };
    await setEditPassword(String(newPassword));
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
