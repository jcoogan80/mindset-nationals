const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { makeClient, getBucketConfig, json } = require("./_r2");

exports.handler = async (event) => {
  const team = (event.queryStringParameters || {}).team;
  if (!team) return json(400, { error: "Missing team parameter" });

  let cfg;
  try {
    cfg = getBucketConfig(team);
  } catch (err) {
    return json(400, { error: err.message });
  }

  try {
    const client = makeClient();
    let allContents = [];
    let continuationToken;
    do {
      const out = await client.send(
        new ListObjectsV2Command({
          Bucket: cfg.bucket,
          MaxKeys: 1000,
          ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        })
      );
      allContents = allContents.concat(out.Contents || []);
      continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (continuationToken);

    const images = allContents
      .filter((o) => o.Size > 0)
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
      .map((o) => ({
        key: o.Key,
        url: `${cfg.publicBaseUrl}/${o.Key}`,
        uploaded: o.LastModified,
        size: o.Size,
      }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
      body: JSON.stringify({ images }),
    };
  } catch (err) {
    return json(500, { error: "Could not list images", detail: String(err.message || err) });
  }
};
