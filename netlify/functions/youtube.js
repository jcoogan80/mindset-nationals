// netlify/functions/youtube.js
exports.handler = async (event) => {
  const { playlistId, pageToken } = event.queryStringParameters || {};

  if (!playlistId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'playlistId required' }) };
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'YOUTUBE_API_KEY not set' }) };
  }

  const params = new URLSearchParams({ part: 'snippet', playlistId, maxResults: '50', key });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
  const data = await res.json();

  if (!res.ok) {
    return { statusCode: res.status, body: JSON.stringify(data) };
  }

  const items = data.items.map(item => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnail: (item.snippet.thumbnails?.medium || item.snippet.thumbnails?.default)?.url || '',
    publishedAt: item.snippet.publishedAt,
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    body: JSON.stringify({ items, nextPageToken: data.nextPageToken || null }),
  };
};
