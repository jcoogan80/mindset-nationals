# CSS Extraction: Hub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all inline CSS from `14red.html` and `15red.html` into three external CSS files (`css/hub.css`, `css/14red.css`, `css/15red.css`), eliminating all duplication.

**Architecture:** Both pages share ~300 lines of identical CSS; that CSS becomes `css/hub.css`. The 14red-exclusive sections (thermometer, event log, donor) plus a 1-line mobile banner height override form `css/14red.css`. `css/15red.css` holds only the 15red banner height override. Both HTML files drop their `<style>` blocks entirely and gain two new `<link>` tags.

**Tech Stack:** Static HTML, CSS, Netlify (no build step)

---

## File Map

| Action | File |
|---|---|
| Create | `css/hub.css` |
| Create | `css/14red.css` |
| Create | `css/15red.css` |
| Modify | `14red.html` (remove `<style>` block lines 15–360; replace 3 link tags with 5) |
| Modify | `15red.html` (remove `<style>` block lines 15–324; replace 3 link tags with 5) |

---

### Task 1: Create css/hub.css

**Files:**
- Create: `css/hub.css`

The shared CSS is the entire `<style>` block from `15red.html` minus the team-banner-img mobile height override. Use `15red.html` as the source because it is the smaller, shared-only subset.

- [ ] **Step 1: Extract source content**

  Read `15red.html` lines 16–323 (the content between `<style>` and `</style>`, not including those tags themselves).

- [ ] **Step 2: Remove the page-specific team-banner-img rule**

  In the extracted content, remove these two lines from the `@media(max-width:480px)` block (they appear near the end of that block):
  ```css
    /* Team photo banner height */
    .team-banner-img{height:250px!important}
  ```
  The surrounding mobile rules (tab min-height, stat-grid, etc.) stay.

- [ ] **Step 3: Write css/hub.css**

  Write the cleaned content to `css/hub.css`. The file should open with:
  ```css
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --red:#CC0000;--darkred:#8B0000;--black:#111;--white:#fff;
    --offwhite:#f8f6f4;--gray:#666;--lightgray:#e8e8e8;--green:#2a9d5c;
    --fd:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;
  }
  body{font-family:var(--fb);background:#f0eeeb;color:var(--black)}
  ```
  And end with the closing `}` of the `@media(max-width:480px)` block.

- [ ] **Step 4: Verify hub.css is complete**

  Confirm the file contains all of these section comments: `HEADER`, `CONFIG BANNER`, `LOADING`, `LOCK`, `LAYOUT`, `STAT BANNER`, `TABS`, `CARDS`, `EDITABLE`, `SAVE FLASH`, `DAY TABS`, `MATCH CARDS`, `UNLOCK BANNER`, `ADD FORM`, `STANDINGS`, `TEAMS`, `PROFILES`, `FUNDRAISING`, `PARKING`, `ROSTER`, `GALLERY`, `TEAM REEL`, `REEL MODAL`, and the mobile `@media` block at the bottom.

  Confirm it does NOT contain `/* THERMOMETER */`, `/* EVENT LOG */`, or `/* DONOR */`.

---

### Task 2: Create css/14red.css

**Files:**
- Create: `css/14red.css`

This file holds the three sections unique to 14 Red plus its mobile banner height override.

- [ ] **Step 1: Write css/14red.css with the exact content below**

  ```css
  /* THERMOMETER */
  .thermo-wrap{background:#fff;border-radius:12px;border:1px solid var(--lightgray);padding:1.1rem 1.1rem .9rem;margin-bottom:.75rem;display:flex;gap:1.2rem;align-items:flex-start}
  .thermo-svg-col{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:.3rem}
  .thermo-info{flex:1}
  .thermo-goal{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--gray);margin-bottom:.18rem}
  .thermo-amount{font-family:var(--fd);font-size:2.2rem;color:var(--red);line-height:1;letter-spacing:1px}
  .thermo-pct{font-size:.78rem;color:var(--gray);margin:.15rem 0 .6rem}
  .thermo-sub{font-size:.72rem;color:var(--gray)}
  .thermo-sub strong{color:var(--black)}
  /* EVENT LOG */
  .flog-wrap{background:#fff;border-radius:12px;border:1px solid var(--lightgray);overflow:hidden;margin-bottom:.75rem}
  .flog-hdr{background:var(--black);color:#fff;padding:.55rem .9rem;display:flex;align-items:center;gap:.42rem}
  .flog-hdr span{font-family:var(--fd);font-size:1rem;letter-spacing:1.5px;flex:1}
  .flog-add{background:var(--offwhite);border-radius:0;padding:.65rem .9rem;display:none;border-bottom:1px solid var(--lightgray)}
  body.em .flog-add{display:block}
  .flog-add-row{display:grid;grid-template-columns:1fr auto auto;gap:.38rem;align-items:end}
  .flog-add-row .fl{font-size:.64rem;color:var(--gray);display:block;margin-bottom:.12rem}
  .flog-body{padding:.5rem .9rem}
  .flog-entry{display:flex;justify-content:space-between;align-items:center;padding:.42rem 0;border-bottom:.5px solid var(--lightgray)}
  .flog-entry:last-child{border-bottom:none}
  .flog-entry-info{flex:1}
  .flog-entry-name{font-size:.82rem;font-weight:600}
  .flog-entry-date{font-size:.66rem;color:var(--gray);margin-top:.06rem}
  .flog-entry-amt{font-family:var(--fd);font-size:1.1rem;color:var(--green);letter-spacing:.5px;margin-right:.5rem}
  .flog-empty{font-size:.78rem;color:var(--gray);text-align:center;padding:.7rem 0}
  /* DONOR */
  .donor-wrap{background:#fff;border-radius:12px;border:1px solid var(--lightgray);overflow:hidden;margin-bottom:.75rem}
  .donor-hdr{background:var(--red);color:#fff;padding:.55rem .9rem}
  .donor-hdr span{font-family:var(--fd);font-size:1rem;letter-spacing:1.5px}
  .donor-body{padding:.75rem .9rem}
  .donor-textarea{width:100%;min-height:90px;font-size:.8rem;padding:.45rem .6rem;border:1.5px solid var(--lightgray);border-radius:7px;font-family:var(--fb);resize:vertical;display:none}
  body.em .donor-textarea{display:block}
  .donor-save-btn{display:none;margin-top:.42rem;background:var(--red);color:#fff;border:none;border-radius:7px;padding:.38rem 1.1rem;font-size:.76rem;font-weight:600;cursor:pointer}
  body.em .donor-save-btn{display:inline-block}
  .donor-display{font-size:.8rem;line-height:1.65;color:var(--black);white-space:pre-wrap}
  .donor-display.empty{color:var(--gray);font-style:italic}
  /* PAGE-SPECIFIC MOBILE */
  @media(max-width:480px){
    .team-banner-img{height:220px!important}
  }
  ```

---

### Task 3: Create css/15red.css

**Files:**
- Create: `css/15red.css`

- [ ] **Step 1: Write css/15red.css with the exact content below**

  ```css
  /* PAGE-SPECIFIC MOBILE */
  @media(max-width:480px){
    .team-banner-img{height:250px!important}
  }
  ```

---

### Task 4: Update 14red.html

**Files:**
- Modify: `14red.html`

The `<style>` block runs from line 15 (`<style>`) through line 360 (`</style>`). The three existing `<link>` tags are on lines 361–363. Both are replaced.

- [ ] **Step 1: Remove the inline style block**

  Delete lines 15–360 from `14red.html` (the entire `<style>…</style>` block, tags included).

- [ ] **Step 2: Replace the three existing link tags with five**

  Find and replace:
  ```html
  <link rel="stylesheet" href="css/modern-scroll.css">
  <link rel="stylesheet" href="css/player-spotlight.css">
  <link rel="stylesheet" href="css/gallery-lightbox.css">
  ```
  With:
  ```html
  <link rel="stylesheet" href="css/hub.css">
  <link rel="stylesheet" href="css/14red.css">
  <link rel="stylesheet" href="css/modern-scroll.css">
  <link rel="stylesheet" href="css/player-spotlight.css">
  <link rel="stylesheet" href="css/gallery-lightbox.css">
  ```

- [ ] **Step 3: Verify the head section**

  Confirm `14red.html` `<head>` now has no `<style>` tag and ends with exactly those 5 `<link>` tags before `</head>`.

---

### Task 5: Update 15red.html

**Files:**
- Modify: `15red.html`

The `<style>` block runs from line 15 (`<style>`) through line 324 (`</style>`). The three existing `<link>` tags are on lines 325–327.

- [ ] **Step 1: Remove the inline style block**

  Delete lines 15–324 from `15red.html` (the entire `<style>…</style>` block, tags included).

- [ ] **Step 2: Replace the three existing link tags with five**

  Find and replace:
  ```html
  <link rel="stylesheet" href="css/modern-scroll.css">
  <link rel="stylesheet" href="css/player-spotlight.css">
  <link rel="stylesheet" href="css/gallery-lightbox.css">
  ```
  With:
  ```html
  <link rel="stylesheet" href="css/hub.css">
  <link rel="stylesheet" href="css/15red.css">
  <link rel="stylesheet" href="css/modern-scroll.css">
  <link rel="stylesheet" href="css/player-spotlight.css">
  <link rel="stylesheet" href="css/gallery-lightbox.css">
  ```

- [ ] **Step 3: Verify the head section**

  Confirm `15red.html` `<head>` now has no `<style>` tag and ends with exactly those 5 `<link>` tags before `</head>`.

---

### Task 6: Visual Verification

- [ ] **Step 1: Open 14red.html in a browser**

  Open `14red.html` directly in a browser (file:// is fine — no server needed for CSS). Check:
  - Header is dark with red bottom border, logo and title visible
  - Stat banner (dark gradient with 5 stat cards) renders correctly
  - Tab bar is sticky and tabs switch sections
  - Schedule section shows match cards with correct win/loss coloring
  - Roster profiles section shows player cards
  - Fundraising thermometer and event log render (14red-specific)
  - No unstyled/raw HTML visible anywhere

- [ ] **Step 2: Open 15red.html in a browser**

  Open `15red.html` in a browser. Check the same list above, minus the thermometer/event-log/donor (15red does not have those sections).

- [ ] **Step 3: Mobile check (optional but recommended)**

  Use browser DevTools responsive mode at 375px width. Verify the tab bar, stat grid (2-column layout), and header mobile bar all render correctly on both pages.

---

### Task 7: Commit

- [ ] **Step 1: Commit all changes**

  ```bash
  git add css/hub.css css/14red.css css/15red.css 14red.html 15red.html
  git commit -m "$(cat <<'EOF'
  Extract inline CSS to external files; create shared hub.css

  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  EOF
  )"
  ```

- [ ] **Step 2: Verify commit**

  ```bash
  git show --stat HEAD
  ```
  Expected output: 5 files changed — `css/hub.css` (new), `css/14red.css` (new), `css/15red.css` (new), `14red.html` (modified), `15red.html` (modified).
