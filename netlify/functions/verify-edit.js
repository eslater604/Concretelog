const { connectLambda } = require("@netlify/blobs");
const { checkPassword } = require("./lib/auth");

exports.handler = async function(event) {
  connectLambda(event);
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };
  try {
    const { password } = JSON.parse(event.body || "{}");
    const role = await checkPassword(password);
    if (!role) await new Promise(r => setTimeout(r, 800)); // slow down guessing
    return { statusCode: role ? 200 : 401, body: JSON.stringify({ ok: !!role, role }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
