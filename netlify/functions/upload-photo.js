// netlify/functions/upload-photo.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not set' }) };
  }
  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { pid, content, extension } = body;
  if (!pid || !content || !extension) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing pid, content, or extension' }) };
  }

  const path = `images/players/${pid}.${extension}`;
  const apiUrl = `https://api.github.com/repos/jcoogan80/mindset-nationals/contents/${path}`;

  // Check if file already exists so we can pass its SHA for updates
  let sha;
  try {
    const check = await fetch(apiUrl, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (check.ok) {
      const existing = await check.json();
      sha = existing.sha;
    }
  } catch {}

  const payload = {
    message: `Upload player photo for ${pid}`,
    content, // raw base64, no data-URL prefix
    ...(sha ? { sha } : {})
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let errMsg;
      try {
        const errJson = await response.json();
        errMsg = errJson.message || JSON.stringify(errJson);
      } catch {
        errMsg = await response.text();
      }
      return { statusCode: response.status, body: JSON.stringify({ error: errMsg, status: response.status, path }) };
    }
    const url = `https://raw.githubusercontent.com/jcoogan80/mindset-nationals/main/${path}`;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
