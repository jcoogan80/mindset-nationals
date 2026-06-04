exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'No token' }) };
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON' }) }; }
  let { pid, content, extension } = body;
  if (!pid || !content) return { statusCode: 400, body: JSON.stringify({ error: 'Missing pid or content' }) };
  if (content.includes('base64,')) content = content.split('base64,')[1];
  extension = extension || 'jpg';
  const path = `images/players/${pid}.${extension}`;
  const apiUrl = `https://api.github.com/repos/jcoogan80/mindset-nationals/contents/${path}`;
  const headers = { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' };
  let sha;
  try { const r = await fetch(apiUrl, { headers }); if (r.ok) { const j = await r.json(); sha = j.sha; } } catch {}
  const payload = { message: `Upload player photo ${pid}`, content, ...(sha ? { sha } : {}) };
  const r = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(payload) });
  if (!r.ok) { const err = await r.text(); return { statusCode: r.status, body: JSON.stringify({ error: err }) }; }
  const url = `https://raw.githubusercontent.com/jcoogan80/mindset-nationals/main/${path}`;
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) };
};
