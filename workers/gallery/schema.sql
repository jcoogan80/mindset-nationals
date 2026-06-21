CREATE TABLE IF NOT EXISTS reactions (
  image_key   TEXT NOT NULL,
  device_id   TEXT NOT NULL,
  team        TEXT NOT NULL,
  reaction    TEXT NOT NULL CHECK(reaction IN ('heart','thumbsup','laughing')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (image_key, device_id)
);
