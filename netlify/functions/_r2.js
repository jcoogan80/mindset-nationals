const { S3Client } = require("@aws-sdk/client-s3");

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function makeClient() {
  const accountId = getEnv("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

const TEAMS = {
  "14red": { bucketVar: "R2_BUCKET_14RED", urlVar: "R2_PUBLIC_BASE_URL_14RED" },
  "15red": { bucketVar: "R2_BUCKET_15RED", urlVar: "R2_PUBLIC_BASE_URL_15RED" },
};

function getBucketConfig(team) {
  const cfg = TEAMS[team];
  if (!cfg) throw new Error(`Unknown team: ${team}`);
  return {
    bucket: getEnv(cfg.bucketVar),
    publicBaseUrl: getEnv(cfg.urlVar).replace(/\/+$/, ""),
  };
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

module.exports = { makeClient, getBucketConfig, json };
