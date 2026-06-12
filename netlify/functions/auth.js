// netlify/functions/auth.js
// Exchanges a GitHub OAuth authorization code for an access token.
// client_secret stays server-side; client_id is safe to expose in the browser.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  const { code } = body;
  if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'Missing code' }) };
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  const data = await r.json();
  if (data.error) return { statusCode: 401, body: JSON.stringify({ error: data.error_description }) };
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: data.access_token }) };
};
