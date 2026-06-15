# Mindset VBC — 2026 Nationals Hub

Static site deployed on Netlify. See `CLAUDE.md` for full architecture notes.

---

## PWA Cache — Updating After a Deploy

The site is a PWA with a service worker that caches pages for offline use. **Every time you push content changes, you must bump the cache version string in `sw.js`** so that users with the app installed receive the update.

### Steps

1. Open [sw.js](sw.js).
2. Find the version constant near the top:
   ```js
   const CACHE = 'mindset-nationals-v1';
   ```
3. Increment the number:
   ```js
   const CACHE = 'mindset-nationals-v2';
   ```
4. Commit and push. Netlify will deploy the new `sw.js`, and on the next page load the browser will detect the change, install the new service worker, delete the old cache, and re-fetch all assets.

### Why this matters

The service worker serves HTML, CSS, and JS from cache first. If `sw.js` itself hasn't changed byte-for-byte, the browser won't update it — users stay on stale content until they manually clear their cache. Bumping the version string guarantees the file changes, triggering a full cache refresh.

### What you don't need to do

- **Data JSON files** (`14red-data.json`, `15red-data.json`) use a network-first strategy, so edits made through the hub's edit mode are always live without a version bump.
- **External resources** (Google Fonts, weather API, CDNs) bypass the service worker entirely.
