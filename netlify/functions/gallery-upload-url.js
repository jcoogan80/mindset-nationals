const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { makeClient, getBucketConfig, json } = require("./_r2");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

function slug(name = "") {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "photo";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { filename, contentType, team, password } = payload;

  if (!password || password !== process.env.GALLERY_PASSWORD) {
    return json(401, { error: "Invalid password" });
  }

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return json(400, { error: "Only image uploads are allowed (jpg, png, gif, webp, avif)." });
  }

  let cfg;
  try {
    cfg = getBucketConfig(team);
  } catch (err) {
    return json(400, { error: err.message });
  }

  const ext = EXT[contentType];
  const key = `${9999999999999 - Date.now()}-${Math.random().toString(36).slice(2, 8)}-${slug(filename)}.${ext}`;

  try {
    const client = makeClient();
    const command = new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return json(200, {
      uploadUrl,
      key,
      publicUrl: `${cfg.publicBaseUrl}/${key}`,
    });
  } catch (err) {
    return json(500, { error: "Could not create upload URL", detail: String(err.message || err) });
  }
};
