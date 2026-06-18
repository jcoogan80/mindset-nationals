const { json } = require("./_r2");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { password } = payload;
  if (password && password === process.env.GALLERY_PASSWORD) {
    return json(200, { valid: true });
  }
  return json(401, { valid: false });
};
