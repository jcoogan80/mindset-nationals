// netlify/functions/save.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set in Netlify environment variables' }) };
  }
  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  const { data, sha, user, repo } = body;
  if (!data || !user || !repo) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const payload = { message: 'Update hub data', content, ...(sha ? { sha } : {}) };
  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) { const err = await response.text(); return { statusCode: response.status, body: JSON.stringify({ error: err }) }; }
    const result = await response.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha: result.content.sha }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
