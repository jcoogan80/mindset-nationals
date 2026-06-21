import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/quicktime", "video/webm",
];
const EXT = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

const TEAMS = {
  "14red": { bucketVar: "R2_BUCKET_14RED", urlVar: "R2_PUBLIC_BASE_URL_14RED" },
  "15red": { bucketVar: "R2_BUCKET_15RED", urlVar: "R2_PUBLIC_BASE_URL_15RED" },
};

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  });
}

function makeClient(env) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function getBucketConfig(team, env) {
  const cfg = TEAMS[team];
  if (!cfg) throw new Error(`Unknown team: ${team}`);
  const bucket = env[cfg.bucketVar];
  const publicBaseUrl = env[cfg.urlVar];
  if (!bucket) throw new Error(`Missing env var: ${cfg.bucketVar}`);
  if (!publicBaseUrl) throw new Error(`Missing env var: ${cfg.urlVar}`);
  return { bucket, publicBaseUrl: publicBaseUrl.replace(/\/+$/, "") };
}

function slug(name = "") {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "photo";
}

async function handleGalleryImages(request, env) {
  const url = new URL(request.url);
  const team = url.searchParams.get("team");
  if (!team) return json(400, { error: "Missing team parameter" });

  const BINDINGS = { "14red": { bucket: env.R2_14RED, urlVar: "R2_PUBLIC_BASE_URL_14RED" }, "15red": { bucket: env.R2_15RED, urlVar: "R2_PUBLIC_BASE_URL_15RED" } };
  const binding = BINDINGS[team];
  if (!binding) return json(400, { error: `Unknown team: ${team}` });

  const publicBaseUrl = (env[binding.urlVar] || "").replace(/\/+$/, "");

  try {
    let allObjects = [];
    let cursor;
    do {
      const listed = await binding.bucket.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
      allObjects = allObjects.concat(listed.objects || []);
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    const images = allObjects
      .filter((o) => o.size > 0 && !o.key.startsWith("thumbnails/"))
      .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded))
      .map((o) => {
        const isImageKey = o.key.startsWith("images/");
        const isVideoKey = o.key.startsWith("videos/");
        const baseKey = isImageKey ? o.key.slice("images/".length)
                      : isVideoKey ? o.key.slice("videos/".length)
                      : o.key;
        const thumbBaseKey = isVideoKey ? baseKey.replace(/\.[^.]+$/, ".jpg") : baseKey;
        const fullUrl = `${publicBaseUrl}/${o.key}`;
        return {
          key: o.key,
          url: fullUrl,
          thumbnailUrl: (isImageKey || isVideoKey) ? `${publicBaseUrl}/thumbnails/${thumbBaseKey}` : fullUrl,
          uploaded: o.uploaded,
          size: o.size,
          type: isVideoKey ? "video" : "image",
        };
      });

    return json(200, { images }, { "Cache-Control": "public, max-age=30" });
  } catch (err) {
    return json(500, { error: "Could not list images", detail: String(err.message || err) });
  }
}

async function handleValidatePassword(request, env) {
  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  if (payload.password && payload.password === env.GALLERY_PASSWORD) {
    return json(200, { valid: true });
  }
  return json(401, { valid: false });
}

async function handleUploadUrl(request, env) {
  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const { filename, contentType, team, password, type = "image" } = payload;

  if (!password || password !== env.GALLERY_PASSWORD) {
    return json(401, { error: "Invalid password" });
  }

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return json(400, { error: "Only image or video uploads are allowed." });
  }

  let cfg;
  try { cfg = getBucketConfig(team, env); }
  catch (err) { return json(400, { error: err.message }); }

  const ext = EXT[contentType];
  const baseKey = `${9999999999999 - Date.now()}-${Math.random().toString(36).slice(2, 8)}-${slug(filename)}.${ext}`;
  const isVideo = type === "video";
  const fileKey = isVideo ? `videos/${baseKey}` : `images/${baseKey}`;
  const thumbBaseKey = isVideo ? baseKey.replace(/\.[^.]+$/, ".jpg") : baseKey;
  const thumbKey = `thumbnails/${thumbBaseKey}`;

  try {
    const client = makeClient(env);
    const [imageUploadUrl, thumbUploadUrl] = await Promise.all([
      getSignedUrl(client, new PutObjectCommand({ Bucket: cfg.bucket, Key: fileKey, ContentType: contentType }), { expiresIn: 300 }),
      getSignedUrl(client, new PutObjectCommand({ Bucket: cfg.bucket, Key: thumbKey, ContentType: "image/jpeg" }), { expiresIn: 300 }),
    ]);

    return json(200, {
      imageUploadUrl,
      thumbUploadUrl,
      key: baseKey,
      imageUrl: `${cfg.publicBaseUrl}/${fileKey}`,
      thumbUrl: `${cfg.publicBaseUrl}/${thumbKey}`,
    });
  } catch (err) {
    return json(500, { error: "Could not create upload URL", detail: String(err.message || err) });
  }
}

async function handleGetReactions(request, env) {
  const url = new URL(request.url);
  const team = url.searchParams.get("team");
  const keysParam = url.searchParams.get("keys");
  const deviceId = url.searchParams.get("deviceId");

  if (!team || !keysParam || !deviceId) {
    return json(400, { error: "Missing team, keys, or deviceId" });
  }

  const keys = keysParam.split(",").filter(Boolean);
  if (!keys.length) return json(200, { reactions: {} });

  const placeholders = keys.map(() => "?").join(",");

  const [countRows, mineRows] = await Promise.all([
    env.DB.prepare(
      `SELECT image_key, reaction, COUNT(*) as cnt FROM reactions WHERE team = ? AND image_key IN (${placeholders}) GROUP BY image_key, reaction`
    ).bind(team, ...keys).all(),
    env.DB.prepare(
      `SELECT image_key, reaction FROM reactions WHERE team = ? AND device_id = ? AND image_key IN (${placeholders})`
    ).bind(team, deviceId, ...keys).all(),
  ]);

  const result = {};
  keys.forEach((k) => {
    result[k] = { counts: { heart: 0, thumbsup: 0, laughing: 0 }, mine: null };
  });

  (countRows.results || []).forEach((row) => {
    if (result[row.image_key]) result[row.image_key].counts[row.reaction] = row.cnt;
  });

  (mineRows.results || []).forEach((row) => {
    if (result[row.image_key]) result[row.image_key].mine = row.reaction;
  });

  return json(200, { reactions: result }, { "Cache-Control": "no-store" });
}

async function handlePostReaction(request, env) {
  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: "Invalid JSON" }); }

  const { team, imageKey, deviceId, reaction } = payload || {};
  if (!team || !imageKey || !deviceId || !reaction) {
    return json(400, { error: "Missing team, imageKey, deviceId, or reaction" });
  }
  if (!["heart", "thumbsup", "laughing"].includes(reaction)) {
    return json(400, { error: "Invalid reaction type" });
  }

  await env.DB.prepare(
    `INSERT OR REPLACE INTO reactions (image_key, device_id, team, reaction) VALUES (?, ?, ?, ?)`
  ).bind(imageKey, deviceId, team, reaction).run();

  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { pathname } = new URL(request.url);

    if (pathname === "/gallery-images" && request.method === "GET") {
      return handleGalleryImages(request, env);
    }
    if (pathname === "/gallery-upload-url" && request.method === "POST") {
      return handleUploadUrl(request, env);
    }
    if (pathname === "/validate-password" && request.method === "POST") {
      return handleValidatePassword(request, env);
    }
    if (pathname === "/reactions" && request.method === "GET") {
      return handleGetReactions(request, env);
    }
    if (pathname === "/reactions" && request.method === "POST") {
      return handlePostReaction(request, env);
    }

    return json(404, { error: "Not found" });
  },
};
