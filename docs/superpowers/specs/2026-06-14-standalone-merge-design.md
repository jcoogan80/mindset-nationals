# Design: Merge Standalone Visual Upgrade into 14red.html

**Date:** 2026-06-14  
**Approach:** Option A — Surgical merge

## Context

A standalone file (`Mindset Premier 14 Red - Nationals Hub (Standalone).html`) was created with new visual features and polish. It is a bundled version (4.8MB with embedded base64 assets). The actual HTML template inside weighs ~647KB cleaned.

The goal is to apply all new styling and features into `14red.html` while preserving all existing functionality: GitHub OAuth edit mode, direct-to-GitHub API saves, contenteditable fields, photo uploads, and the Netlify function integrations.

---

## What Changes

### 1. New `<style>` blocks (appended after existing `</style>`)

Three new named style blocks, each self-contained:

**`<style id="modern-scroll">`**
- CSS variable `--ease-out: cubic-bezier(.2,.7,.2,1)`
- `.scroll-progress` — fixed red gradient bar at very top tracking scroll %
- `.hdr.scrolled` — drop shadow when user scrolls past 40px
- `.hero` — full-screen dark hero section with radial gradients and a diagonal stripe texture
- `.hero-medallion` — circular team logo with spinning conic gradient ring and floating animation
- `.hero-eyebrow`, `.hero-title`, `.hero-sub`, `.hero-cd`/`.hcd` — hero typography and countdown tiles
- `.hero-cue` — animated "Scroll ↓" cue at bottom of hero
- `.to-top` — fixed floating back-to-top button (red circle, bottom-left)
- `.tabbar.stuck` — box shadow when tab bar is stuck to top
- Reveal-on-scroll: `html.js-reveal [data-reveal]` — elements enter viewport fading+sliding up
- `@prefers-reduced-motion` overrides for all animations

**`<style id="player-spotlight">`**
- `.pcard` hover lift effect (non-edit-mode only)
- `.pview` — "expand" icon overlay on player photo hover
- `.spot` — full-screen player spotlight modal (dark blurred backdrop)
- `.spot-card`, `.spot-photo`, `.spot-bignum`, `.spot-cap`, `.spot-name`, `.spot-pos` — card layout
- `.spot-meta`, `.spot-rows`, `.spot-stat`, `.spot-ig`, `.spot-reel` — stats/links section
- `.spot-close`, `.spot-nav`, `.spot-dots` — navigation controls

**`<style id="gallery-lightbox">`**
- `.lbx` — full-screen photo lightbox (dark blurred backdrop)
- `.lbx-img`, `.lbx-nav`, `.lbx-close`, `.lbx-count` — lightbox controls
- `.playall` — "Play All" slideshow button in Photos section header
- Gallery tile hover lift/scale (non-edit-mode only)
- `.team-banner { cursor: zoom-in }` — team banner opens lightbox on tap
- Day-tabs smooth panel fade and overflow scroll

---

### 2. Updated CSS rules in existing `<style>` block

**Stat Banner** (`.stat-row`, `.sp` and related):
- `.stat-row` — replaced simple dark bar with dark gradient card (`linear-gradient(158deg,...)`) with border, border-radius 15px, box-shadow
- Added `.stat-head`, `.stat-head-t`, `.stat-head-y` — "Season Record" label + year pill header
- Added `.stat-grid` — 5-column grid replacing flex layout
- `.sp` — redesigned: flex-column, uses `--sp-accent`/`--sp-glow`/`--sp-icbg` CSS custom props, `::before` accent stripe, `::after` radial glow
- Added `.sp-ic` — icon circle inside each stat tile
- `.spn` — larger fluid size with `clamp()`
- `.spl` — uppercase letter-spaced label
- Color variants `sp-r/w/l/m/p` — now use CSS custom props (accent colors, glow colors)
- Staggered reveal animation via `html.js-reveal .stat-row .sp`
- Mobile: stat-grid collapses to 2-column; win-rate tile spans full width

**Tabs** (`.tabbar`, `.tabs`, `.tab`):
- Added `.tabbar` — sticky wrapper, positioned below header using `--hdr-h` CSS var, edge fade `::before`/`::after` pseudos
- `.tabs` — `overflow-x:auto`, `scroll-behavior:smooth`, no `flex-wrap`
- `.tab` — `flex:0 0 auto`, min-height 40px, `gap:.34rem` for icon+text, box-shadow on `.active`
- Mobile: tab min-height 44px (was handled by blanket `button{min-height:44px}`)

**Section animation:**
- `.sec.on` — `animation: secfade .38s` fade+slide in (respects `prefers-reduced-motion`)

---

### 3. New HTML elements

**Hero section** — inserted immediately after `</header>` (before the lock overlay / `.saved` divs):
```html
<section class="hero" id="hero">
  <div class="hero-inner">
    <div class="hero-eyebrow">2026 USAV Girls Junior Nationals</div>
    <div class="hero-medallion-wrap">
      <div class="hero-medallion"><img id="hero-logo" alt="Mindset Premier 14 Red"></div>
    </div>
    <h1 class="hero-title">Mindset Premier<br><span class="rd">14 Red</span></h1>
    <p class="hero-sub">National Championships · Indianapolis, IN · June 25–28</p>
    <div class="hero-cd" aria-label="Countdown to first serve">
      <div class="hcd"><span class="n" id="hcd-d">00</span><span class="l">Days</span></div>
      <div class="hcd"><span class="n" id="hcd-h">00</span><span class="l">Hrs</span></div>
      <div class="hcd"><span class="n" id="hcd-m">00</span><span class="l">Min</span></div>
      <div class="hcd"><span class="n" id="hcd-s">00</span><span class="l">Sec</span></div>
    </div>
  </div>
  <div class="hero-cue"><span>Scroll</span><i class="ti ti-chevron-down"></i></div>
</section>
```

**Scroll progress + back-to-top** — inserted immediately after the hero `</section>` (these are `position:fixed` so placement is flexible, but keeping them together with the hero is cleanest):
```html
<div class="scroll-progress" id="scroll-progress"></div>
<button class="to-top" id="to-top" aria-label="Back to top"><i class="ti ti-arrow-up"></i></button>
```

**Stat row restructure** — existing `.stat-row` inner content replaced:
```html
<div class="stat-row">
  <div class="stat-head">
    <span class="stat-head-t">Season Record</span>
    <span class="stat-head-y">2025–26</span>
  </div>
  <div class="stat-grid">
    <div class="sp sp-r"><div class="sp-ic"><i class="ti ti-trophy"></i></div><span class="spn">#82</span><span class="spl">National Rank</span></div>
    <div class="sp sp-w"><div class="sp-ic"><i class="ti ti-circle-check"></i></div><span class="spn">66</span><span class="spl">Wins</span></div>
    <div class="sp sp-l"><div class="sp-ic"><i class="ti ti-circle-x"></i></div><span class="spn">7</span><span class="spl">Losses</span></div>
    <div class="sp sp-m"><div class="sp-ic"><i class="ti ti-ball-volleyball"></i></div><span class="spn">73</span><span class="spl">Matches</span></div>
    <div class="sp sp-p"><div class="sp-ic"><i class="ti ti-trending-up"></i></div><span class="spn">90.4%</span><span class="spl">Win Rate</span></div>
  </div>
</div>
```

**Tabbar wrapper** — `.tabs` div wrapped in:
```html
<div class="tabbar" id="tabbar">
  <div class="tabs" id="tabs"> ... </div>
</div>
```
Note: `id="tabs"` must be added to the inner `.tabs` div (didn't have it before).

---

### 4. New `<script>` blocks (appended before `</body>`)

Five self-contained IIFEs in order:

1. **Modern scroll effects** (5146 chars) — hero logo mirror, hero entrance, reveal-on-scroll IntersectionObserver, count-up animation on stat banner, scroll-linked parallax/opacity on hero, scroll progress bar, back-to-top, hero countdown (`hcd-d/h/m/s`)
2. **Player spotlight** (8085 chars) — builds `.spot` DOM on first use, tapping a player card opens spotlight, prev/next/dots navigation, keyboard (Escape/arrows), body scroll lock
3. **Photo lightbox** (4013 chars) — builds `.lbx` DOM on first use, tapping gallery photos or team banner opens lightbox, prev/next navigation, play slideshow, keyboard support
4. **Tab bar** (2241 chars) — sets `--hdr-h` CSS var, detects stuck state, updates edge fades on scroll, centers active tab on click
5. **Swipe between sections** (1409 chars) — touch swipe left/right to advance/retreat through main tabs (blocked inside scrollable sub-elements)

---

## What Does NOT Change

- GitHub OAuth flow (`promptEdit`, `handleOAuthCallback`, `checkPw`)
- GitHub Contents API save logic (`saveData`, `pushToGitHub`)
- All data rendering functions (`renderSchedule`, `renderPlayers`, `renderStandings`, etc.)
- All contenteditable `.e` fields and their blur handlers
- Photo upload (`uploadPhoto` Netlify function)
- Team reel embed logic
- Hotel, venue, fundraising, roster, gallery tab content
- `15red.html` (not touched)

---

## Risk Notes

- The stat-row HTML change removes the old `.spn`/`.spl` inline structure and replaces it. The JS never reads back stat values from the DOM (they come from `14red-data.json`), so this is safe.
- The `id="tabs"` addition to the `.tabs` div is purely additive — nothing in existing JS queries by that ID.
- The hero's `#hero-logo` `<img>` is populated by the scroll-effects script using `hdr-logo`'s `src`. The existing `hdr-logo` is already populated from data JSON, so this works automatically.
- The 5 new scripts are fully self-contained IIFEs. They don't call or modify any existing functions.
