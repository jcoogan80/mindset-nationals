# CSS Extraction: 14red.html & 15red.html

**Date:** 2026-06-14  
**Status:** Approved

## Goal

Move all inline CSS from `14red.html` and `15red.html` into external CSS files. Create a shared file for the ~100% duplicated styles and page-specific files for the small number of differences.

## Files Created

| File | Purpose |
|---|---|
| `css/hub.css` | All shared CSS (~310 lines) used by both team hub pages |
| `css/14red.css` | Thermometer, event log, donor sections + mobile `.team-banner-img` height override (220px) |
| `css/15red.css` | Mobile `.team-banner-img` height override only (250px) |

## Files Modified

### `14red.html`
- Remove the entire `<style>…</style>` block (lines 15–360)
- Replace the three existing `<link>` tags at the bottom of `<head>` with:
  ```html
  <link rel="stylesheet" href="css/hub.css">
  <link rel="stylesheet" href="css/14red.css">
  <link rel="stylesheet" href="css/modern-scroll.css">
  <link rel="stylesheet" href="css/player-spotlight.css">
  <link rel="stylesheet" href="css/gallery-lightbox.css">
  ```

### `15red.html`
- Remove the entire `<style>…</style>` block (lines 15–324)
- Replace the three existing `<link>` tags at the bottom of `<head>` with:
  ```html
  <link rel="stylesheet" href="css/hub.css">
  <link rel="stylesheet" href="css/15red.css">
  <link rel="stylesheet" href="css/modern-scroll.css">
  <link rel="stylesheet" href="css/player-spotlight.css">
  <link rel="stylesheet" href="css/gallery-lightbox.css">
  ```

## What Goes in hub.css

All sections present identically in both files:
- Reset + `:root` CSS variables
- `body`
- HEADER (`.hdr`, `.hdr-main`, `.hdr-logo`, `.hdr-title`, `.hdr-right`, countdown, weather, edit button)
- CONFIG BANNER (`#cfg-banner`)
- LOADING (`.lbar`)
- LOCK (`.overlay`, `.lock-box`, etc.)
- LAYOUT (`.wrap`)
- STAT BANNER (`.stat-row`, `.sp`, `.sp-r/w/l/m/p`, reveal animations)
- TABS (`.tabbar`, `.tabs`, `.tab`, `.sec`, `.sec-hd`)
- CARDS (`.card`, `.ct`, `.cs`, `.igrid`, `.ib`, `.il`, `.iv`)
- EDITABLE (`.e`, `body.em .e`, `.ehint`)
- SAVE FLASH (`.saved`, `.toast`)
- DAY TABS (`.dtabs`, `.dtab`, `.dpanel`, `.dhdr`, `.dsum`, `.ds-box`, `.dsn`, `.dsl`, `.sbadge`)
- MATCH CARDS (`.mc`, `.mt`, `.mvs`, `.msc`, `.mm`)
- UNLOCK BANNER (`.ubanner`, `.ubtn`)
- ADD FORM (`.aform`, `.fg2`, `.fg3`, `.fl`, `.fi`, `.abtn`, `.delbtn`, `.unlock-next`)
- STANDINGS (`.pl`, `.st`)
- TEAMS (`.tr.us`, `.rdot`, `.wl`)
- PROFILES (`.pgrid`, `.pcard`, `.pwrap`, `.pph`, `.pupbtn`, `.pbody`, `.pnum`, `.pname`, `.pstat`, `.pig`, `.rbox`, `.rph`)
- PARKING (`.pki`, `.pkico`)
- ROSTER (`.rgrid`, `.rcard`, `.rnum`, `.rname`, `.rpos`)
- GALLERY (`.ggrid`, `.gslot`, `.gh`, `.gdel`)
- TEAM REEL (`.trwrap`, `.trhdr`, `.tredit-btn`, `.trdisplay`, `.trph`, `.trplaybtn`, `.triframe`, `.tredit-panel`, `.di`)
- REEL MODAL (`.moverlay`, `.mbox`, `.mhdr`, `.mclose`, `.mbody`, `.mvw`)
- MOBILE MEDIA QUERY (`@media(max-width:480px)`) — all shared overrides except `.team-banner-img` height

## What Goes in 14red.css

Sections only present in `14red.html`:
- THERMOMETER (`.thermo-wrap`, `.thermo-svg-col`, `.thermo-info`, `.thermo-goal`, `.thermo-amount`, `.thermo-pct`, `.thermo-sub`)
- EVENT LOG (`.flog-wrap`, `.flog-hdr`, `.flog-add`, `.flog-add-row`, `.flog-body`, `.flog-entry`, `.flog-entry-*`, `.flog-empty`)
- DONOR (`.donor-wrap`, `.donor-hdr`, `.donor-body`, `.donor-textarea`, `.donor-save-btn`, `.donor-display`)
- Mobile override: `.team-banner-img{height:220px!important}`

## What Goes in 15red.css

- Mobile override: `.team-banner-img{height:250px!important}`

## Constraints

- No build step — files are served as-is from Netlify
- Static site — load order matters; `hub.css` must load before page-specific files
- No existing inline styles on `<body>`, `<html>`, or elements should be moved — only the `<style>` block in `<head>`
- Inline `style=""` attributes on individual HTML elements (e.g., the team banner div) are out of scope
