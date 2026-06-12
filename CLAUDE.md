# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A static website for the Mindset VBC 2026 USAV Girls Junior Nationals tournament, deployed on Netlify. No build step, no bundler — every page is a self-contained HTML file with embedded CSS and vanilla JS.

## Architecture

### Pages
| File | Purpose |
|---|---|
| `index.html` | Landing page — links to team hubs with a countdown timer |
| `14red.html` | Team hub for Premier 14 Red (U14) |
| `15red.html` | Team hub for Premier 15 Red (U15) |
| `fun.html` | Interactive mini-games (volleyball trivia, slot machine) for players |
| `consent.html` | Parent consent form (photo/web) that writes to `consent-data.json` via Netlify Function |
| `admin.html` | Password-gated admin view of consent responses with CSV export |

### Data Layer
Each team hub reads from its own JSON file:
- `14red-data.json` — hub content, match schedule, player roster, slot leaderboard for 14 Red
- `15red-data.json` — same structure for 15 Red
- `data.json` — shared/fallback hub config (hotels, venues, parking, logistics)
- `consent-data.json` — array of parent consent submissions

The team hub pages (`14red.html`, `15red.html`) fetch their JSON at load time, populate all editable fields, and re-save via the Netlify Function on every edit. The GitHub repo itself is the database — all saves go through the GitHub Contents API via `GITHUB_TOKEN`.

### Netlify Functions (`netlify/functions/`)
- **`auth.js`** — `POST /` to exchange a GitHub OAuth `code` for an access token. Requires `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in Netlify env. Returns `{ token }`.
- **`save.js`** — legacy `POST /` save via server-side `GITHUB_TOKEN`. No longer used for data saves (saves now go direct from browser), but kept as a fallback.
- **`upload-photo.js`** — `POST /` to base64-upload a player photo to `images/players/<pid>.<ext>`. Accepts `token` in the request body (user's OAuth token); falls back to `GITHUB_TOKEN` env var.

Required Netlify env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. `GITHUB_TOKEN` only needed if photo uploads should work without an OAuth session.

### Edit Mode & Auth
Edit mode is gated by GitHub OAuth. Clicking "Edit" redirects to `github.com/login/oauth/authorize` with `scope: repo`. After GitHub redirects back with `?code=`, the page calls `/.netlify/functions/auth` to exchange the code for a token, stores it in `sessionStorage`, and auto-enables edit mode.

While in edit mode (`body.em`), any element with class `e` becomes a `contenteditable` field (styled with a red dashed underline). On blur, the page calls the GitHub Contents API **directly from the browser** using the stored OAuth token to write the full data JSON. No Netlify function involved in saves.

To set up the GitHub OAuth App: register at `github.com/settings/applications/new`, add both `/14red.html` and `/15red.html` as callback URLs, then add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to Netlify env. Update `GH_CLIENT_ID` in both HTML files with the app's client ID.

### Player Photos
Player photos live at `images/players/<pid>.jpg` in the repo and are served via the GitHub raw URL pattern:
```
https://raw.githubusercontent.com/jcoogan80/mindset-nationals/main/images/players/<pid>.jpg
```
The `upload-photo` function updates these in place (fetches existing `sha` first to handle overwrites).

### CSS Conventions
- CSS variables: `--red: #CC0000`, `--black: #1a1a1a` (dark pages) or `#111` (light-bg pages), `--fd` (Bebas Neue display font), `--fb` (DM Sans body font)
- Light-background pages (`14red.html`, `15red.html`, `fun.html`) use `background: #f0eeeb` body
- Dark-background pages (`index.html`, `consent.html`, `admin.html`) use `background: var(--black)`

## Deployment

Netlify auto-deploys from the `main` branch of `jcoogan80/mindset-nationals`. The `publish` directory is `.` (repo root). No build command.

## Local Development

Open any `.html` file directly in a browser. Netlify Functions won't run locally without the Netlify CLI — save/upload actions will fail until deployed. For quick UI work, static content can be previewed without the functions.

```bash
# Optional: run with Netlify Dev to test functions locally
npx netlify dev
```

Required env var for functions: `GITHUB_TOKEN` (a GitHub PAT with `contents: write` on the target repo).
