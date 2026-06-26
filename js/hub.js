// ═══════════════════════════════════════════════════════════════════
//  hub.js — shared team-hub core for 14red.html / 15red.html
//
//  Reads window.HUB_CONFIG (set by js/config-<team>.js, loaded first).
//  Team-unique features live in js/hub-<team>.js plugins, which hook in
//  through window.Hub (onRender / onBoot / onTabEnter / expose).
// ═══════════════════════════════════════════════════════════════════

const CFG = window.HUB_CONFIG;
const PLAYERS      = CFG.players      ?? [];
const STAFF        = CFG.staff        ?? [];
const CHEERLEADERS = CFG.cheerleaders ?? [];

// ── Shared constants (same for every team / the whole tournament) ──
const GITHUB_USER = 'jcoogan80';
const GITHUB_REPO = 'mindset-nationals';
const EDIT_PW     = 'Pr3m!er26';
const FIRST_SERVE = '2026-06-25T08:00:00';
const WEATHER = { lat: 39.7684, lon: -86.1581, tz: 'America/Chicago' };

// First-serve date as a single source of truth (modern-scroll.js reads this).
window.FIRST_SERVE = FIRST_SERVE;

const DEMO = (GITHUB_USER === 'YOUR_GITHUB_USERNAME' || GITHUB_USER === '');
const API  = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${CFG.dataFile}`;
const CACHE_KEY = `hub_cache_${CFG.dataFile}`;

// ── State ──────────────────────────────────────────────────────────
let D = { hub: {}, matches: { 1: [], 2: [], 3: [], 4: [] }, teams: [], players: {} };
let fileSHA = '';
let editMode = false;
let saveTimer = null;
let dataLoadedFromGitHub = false;
const pageLoadTime = Date.now();
let activeReelPid = null;
const playerReels = {};

// ── Plugin extension points ────────────────────────────────────────
const renderHooks = [];
const bootHooks   = [];
const tabEnter    = {};   // tab name → handler (may return a cleanup fn)
let tabCleanups   = [];   // cleanups to run when the active tab changes

const Hub = {
  cfg: CFG,
  get data() { return D; },
  set data(v) { D = v; },
  get editMode() { return editMode; },
  save: saveData,
  toast,
  toEmbed,
  bindEditables,
  onBoot:      (fn) => bootHooks.push(fn),
  onRender:    (fn) => renderHooks.push(fn),
  onTabEnter:  (name, fn) => { tabEnter[name] = fn; },
  onTabCleanup:(fn) => tabCleanups.push(fn),
  expose:      (obj) => Object.assign(window, obj),
};
window.Hub = Hub;

// ── Boot ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  if (DEMO) document.getElementById('cfg-banner').style.display = 'block';
  setupTabs();
  setupDayTabs();
  countdown();
  fetchWeather();
  setInterval(fetchWeather, 30 * 60 * 1000);

  await loadData();

  buildDayPanels();
  buildProfiles();
  buildStaffGrid();
  buildCheerleadersGrid();

  bootHooks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  renderAll();

  if (location.hash) switchTab(location.hash.slice(1));
});

document.addEventListener('DOMContentLoaded', () => bindEditables());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReel(); });

// ── GitHub I/O ─────────────────────────────────────────────────────
function showLoadBanner(text, cls) {
  if (document.getElementById('load-error-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'load-error-banner';
  banner.className = cls;
  banner.textContent = text;
  document.body.prepend(banner);
  const editBtn = document.getElementById('edit-btn');
  if (editBtn) { editBtn.disabled = true; editBtn.classList.add('disabled'); }
}

async function loadData() {
  if (DEMO) { applyDefaults(); return; }
  loading(true);
  try {
    // Read the data file straight from the deployed site (relative path) — fast,
    // and avoids the GitHub Contents API rate limit. Saves still go through GitHub:
    // saveData fetches the file SHA on demand when it's missing.
    const r = await fetch(`${CFG.dataFile}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
    dataLoadedFromGitHub = true;
    // Cache the last good copy so a future failed read can still render.
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(D)); } catch (e) { /* quota — ignore */ }
  } catch (e) {
    // Editing stays disabled in both fallback paths: with no valid fileSHA a save
    // could clobber newer data (preserves the existing safety guard).
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e2) { /* ignore */ }
    if (cached) {
      D = cached;
      toast('Showing last saved data — couldn’t load the latest');
      showLoadBanner('⚠️ Offline — showing last saved data. Editing is disabled until reload.', 'load-error-banner soft');
    } else {
      toast('Could not load data — check your connection');
      applyDefaults();
      showLoadBanner('⚠️ Failed to load saved data — editing is disabled. Refresh to try again.', 'load-error-banner');
    }
  }
  loading(false);
}

async function saveData() {
  if (DEMO || !editMode) return;
  if (!dataLoadedFromGitHub) {
    toast('⚠️ Cannot save — data failed to load. Refresh the page.');
    return;
  }
  if (D.teams.length === 0 && Date.now() - pageLoadTime < 30000) {
    toast('⚠️ Data not fully loaded — refresh before saving');
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    loading(true);
    try {
      if (!fileSHA) {
        const meta = await fetch(`${API}?t=${Date.now()}`, { headers: { Accept: 'application/vnd.github.v3+json' } });
        if (meta.ok) { const mj = await meta.json(); fileSHA = mj.sha; }
      }
      const body = () => JSON.stringify({ data: D, sha: fileSHA, user: GITHUB_USER, repo: GITHUB_REPO, file: CFG.dataFile });
      // Token lives in Netlify env — never in this file
      let r = await fetch('/.netlify/functions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body(),
      });
      if (r.status === 409) {
        // SHA conflict — re-fetch the latest SHA and retry once
        const fresh = await fetch(`${API}?t=${Date.now()}`, { headers: { Accept: 'application/vnd.github.v3+json' } });
        if (fresh.ok) { const fj = await fresh.json(); fileSHA = fj.sha; }
        r = await fetch('/.netlify/functions/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body(),
        });
      }
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      fileSHA = j.sha;
      flashSaved();
    } catch (e) {
      toast(`Save failed — ${e.message}`);
    }
    loading(false);
  }, 1200);
}

function applyDefaults() {
  D.hub = D.hub || {};
  D.matches = D.matches || { 1: [], 2: [], 3: [], 4: [] };
  D.teams = D.teams || [];
  D.players = D.players || {};
  if (!D.matches.pool) D.matches.pool = [0, 1, 2, 3, 4].map(() => ({ scores: [['', ''], ['', ''], ['', '']], result: 'pending' }));
}

// ── Render all ─────────────────────────────────────────────────────
function renderAll() {
  renderEditables();
  renderStandings();
  renderTeams();
  [1, 2, 3, 4].forEach((d) => { renderMatches(d); updateDayTab(d); });
  renderPlayerData();
  renderPoolSchedule();
  bindPoolSchedule();
  renderHooks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}

function renderEditables() {
  document.querySelectorAll('[data-key]').forEach((el) => {
    const v = D.hub[el.dataset.key];
    if (v !== undefined) el.textContent = v;
  });
}

function renderPlayerData() {
  PLAYERS.forEach((p) => {
    const pd = D.players[p.id] || {};
    ['num', 'name', 'position', 'height', 'instagram'].forEach((f) => {
      const el = document.querySelector(`[data-pid="${p.id}"][data-pf="${f}"]`);
      if (el && pd[f]) el.textContent = pd[f];
    });
    if (pd.photo_url) {
      const th = pd.photo_url.replace('images/players/', 'images/players/thumbs/').replace(/\.(png|gif|webp)$/, '.jpg');
      setPhoto(p.id, th, pd.photo_url);
    }
    if (pd.reel_url) { playerReels[p.id] = { type: 'url', src: pd.reel_url }; updateReelUI(p.id); }
  });
}

// ── Editables ──────────────────────────────────────────────────────
function bindEditables(root) {
  (root || document).querySelectorAll('[data-key]').forEach((el) => {
    if (el._eb) return;
    el._eb = true;
    el.contentEditable = 'false';
    el.addEventListener('blur', () => {
      if (!editMode) return;
      const v = el.textContent.trim();
      if (D.hub[el.dataset.key] !== v) { D.hub[el.dataset.key] = v; saveData(); }
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });
}

function bindPlayerEditables(root) {
  (root || document).querySelectorAll('[data-pf]').forEach((el) => {
    if (el._eb) return;
    el._eb = true;
    el.contentEditable = 'false';
    el.addEventListener('blur', () => {
      if (!editMode) return;
      const { pid, pf: f } = el.dataset;
      const v = el.textContent.trim();
      if (!D.players[pid]) D.players[pid] = {};
      if (D.players[pid][f] !== v) { D.players[pid][f] = v; saveData(); }
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });
}

// ── Schedule ───────────────────────────────────────────────────────
const DAY_CFG = [
  { d: 1, label: 'Day 1 — Pool Play',    date: 'Thursday, June 25 · Indiana Convention Center', badge: 'Pool Play' },
  { d: 2, label: 'Day 2 — Bracket Play', date: 'Friday, June 26 · Venue TBD',                   badge: 'In Progress' },
  { d: 3, label: 'Day 3 — Bracket Play', date: 'Saturday, June 27 · Venue TBD',                 badge: 'In Progress' },
  { d: 4, label: 'Day 4 — Championship', date: 'Sunday, June 28 · Venue TBD',                   badge: '🏆 Championship!' },
];

function buildDayPanels() {
  const c = document.getElementById('day-panels');
  c.innerHTML = '';
  DAY_CFG.forEach(({ d, label, date, badge }) => {
    const isLocked = d === 1 ? false : (D.hub[`day${d}_locked`] !== false && D.hub[`day${d}_locked`] !== 'false');
    const div = document.createElement('div');
    div.className = 'dpanel' + (d === 1 ? ' on' : '');
    div.id = `dpanel${d}`;
    div.innerHTML = `
      <div id="dlock${d}" class="ubanner" style="${!isLocked ? 'display:none' : ''}">
        <i class="ti ti-lock"></i>
        <p>Day ${d} schedule available after Day ${d - 1} results.<br>Unlock when the schedule is posted.</p>
        <button class="ubtn" id="ubtn${d}" onclick="unlockDay(${d})" ${!editMode ? 'disabled' : ''}>
          <i class="ti ti-lock-open"></i> Unlock Day ${d}
        </button>
      </div>
      <div id="dcont${d}" style="${isLocked ? 'display:none' : ''}">
        <div class="dhdr">
          <div><h3>${label}</h3><p class="e" data-key="day${d}_date">${D.hub[`day${d}_date`] || date}</p></div>
          <span class="sbadge">${badge}</span>
        </div>
        <div class="dsum">
          <div class="ds-box"><div class="dsn g" id="dw${d}">0</div><div class="dsl">Wins</div></div>
          <div class="ds-box"><div class="dsn r" id="dl${d}">0</div><div class="dsl">Losses</div></div>
          <div class="ds-box"><div class="dsn gr" id="dp${d}">0</div><div class="dsl">Pending</div></div>
        </div>
        <div id="matches${d}"></div>
        <div class="aform">
          <div class="aform-hd"><i class="ti ti-plus"></i>Add Match</div>
          <div class="fg2">
            <div><label class="fl">Opponent</label><input class="fi" id="m${d}opp" placeholder="Chicago Elite"></div>
            <div><label class="fl">Time & Court</label><input class="fi" id="m${d}tc" placeholder="9:00 AM · Court 4"></div>
          </div>
          <div class="fg3">
            <div><label class="fl">Our Score</label><input class="fi" id="m${d}us" placeholder="2"></div>
            <div><label class="fl">Their Score</label><input class="fi" id="m${d}th" placeholder="0"></div>
            <div><label class="fl">Result</label><select class="fi" id="m${d}res"><option value="upcoming">TBD</option><option value="win">Win ✓</option><option value="loss">Loss ✗</option></select></div>
          </div>
          <button class="abtn" onclick="addMatch(${d})">Add to Day ${d}</button>
        </div>
        <div class="card card-notes">
          <span class="notes-hd"><i class="ti ti-notes"></i>Notes</span>
          <div class="cs e notes-body" data-key="day${d}_notes">${D.hub[`day${d}_notes`] || 'Notes, court assignments...'}</div>
        </div>
        ${d < 4 ? `<button class="unlock-next" onclick="unlockDay(${d + 1})"><i class="ti ti-lock-open"></i> Unlock Day ${d + 1}</button>` : ''}
      </div>`;
    c.appendChild(div);
  });
  bindEditables(c);
}

function renderMatches(d) {
  const c = document.getElementById(`matches${d}`);
  if (!c) return;
  c.innerHTML = '';
  const arr = D.matches[d] || [];
  let w = 0, l = 0, p = 0;
  arr.forEach((m, i) => {
    if (m.result === 'win') w++; else if (m.result === 'loss') l++; else p++;
    const sc = (m.score_us && m.score_them) ? `${m.score_us} – ${m.score_them}` : '';
    const sd = m.result === 'upcoming' ? 'TBD' : (sc || m.result.toUpperCase());
    const div = document.createElement('div');
    div.className = `mc ${m.result}`;
    div.innerHTML = `<div class="mt"><span class="mvs">vs. ${m.opponent}</span><span class="msc ${m.result}">${sd}</span></div>
      <div class="mm">${m.time_court ? `<span><i class="ti ti-clock"></i> ${m.time_court}</span>` : ''}<button class="delbtn" onclick="delMatch(${d},${i})" aria-label="Delete match"><i class="ti ti-trash"></i></button></div>`;
    c.appendChild(div);
  });
  const dw = document.getElementById(`dw${d}`), dl = document.getElementById(`dl${d}`), dp = document.getElementById(`dp${d}`);
  if (dw) dw.textContent = w;
  if (dl) dl.textContent = l;
  if (dp) dp.textContent = p;
}

function addMatch(d) {
  if (!editMode) return;
  const g = (id) => document.getElementById(id);
  const opp = g(`m${d}opp`).value.trim();
  if (!opp) { toast('Enter opponent name'); return; }
  const m = {
    opponent: opp,
    time_court: g(`m${d}tc`).value.trim(),
    score_us: g(`m${d}us`).value.trim(),
    score_them: g(`m${d}th`).value.trim(),
    result: g(`m${d}res`).value,
  };
  if (!D.matches[d]) D.matches[d] = [];
  D.matches[d].push(m);
  renderMatches(d);
  ['opp', 'tc', 'us', 'th'].forEach((f) => { g(`m${d}${f}`).value = ''; });
  g(`m${d}res`).value = 'upcoming';
  saveData();
}

function delMatch(d, i) {
  D.matches[d].splice(i, 1);
  renderMatches(d);
  saveData();
}

function unlockDay(d) {
  D.hub[`day${d}_locked`] = false;
  updateDayTab(d);
  const lk = document.getElementById(`dlock${d}`), ct = document.getElementById(`dcont${d}`);
  if (lk) lk.style.display = 'none';
  if (ct) ct.style.display = 'block';
  saveData();
  toast(`Day ${d} unlocked!`);
}

function updateDayTab(d) {
  if (d === 1) return;
  const tab = document.getElementById(`dtab${d}`), ds = document.getElementById(`ds${d}`);
  const locked = D.hub[`day${d}_locked`] !== false && D.hub[`day${d}_locked`] !== 'false';
  if (locked) { tab.classList.add('locked'); if (ds) ds.textContent = 'Locked'; }
  else { tab.classList.remove('locked'); if (ds) ds.textContent = ['', 'Jun 25', 'Jun 26', 'Jun 27', 'Jun 28'][d]; }
  const ub = document.getElementById(`ubtn${d}`);
  if (ub) ub.disabled = !editMode;
}

// ── Standings ──────────────────────────────────────────────────────
function renderStandings() {
  const tb = document.getElementById('stand-body');
  if (!tb) return;
  const rows = [CFG.teamName, 'Team 2', 'Team 3', 'Team 4'];
  tb.innerHTML = rows.map((name, i) => `
    <tr class="${i === 0 ? 'hl' : ''}">
      <td><span class="st-rank">${i + 1}</span></td>
      <td class="st-team">${i === 0 ? `<strong>${name}</strong>` : `<span class="e" data-key="st_name${i}">${D.hub[`st_name${i}`] || name}</span>`}</td>
      <td class="st-w"><span class="e" data-key="st_w${i}">${D.hub[`st_w${i}`] || 0}</span></td>
      <td class="st-l"><span class="e" data-key="st_l${i}">${D.hub[`st_l${i}`] || 0}</span></td>
      <td class="st-sets"><span class="e" data-key="st_sw${i}">${D.hub[`st_sw${i}`] || 0}</span></td>
      <td class="st-sets"><span class="e" data-key="st_sl${i}">${D.hub[`st_sl${i}`] || 0}</span></td>
    </tr>`).join('');
  bindEditables(tb);
}

// ── Teams ──────────────────────────────────────────────────────────
function renderTeams() {
  const by = document.getElementById('team-sort')?.value || 'seed';
  const arr = [...D.teams].sort((a, b) => {
    if (by === 'seed') return (a.seed || 9999) - (b.seed || 9999);
    if (by === 'rank') return (a.rank || 9999) - (b.rank || 9999);
    if (by === 'name') return a.name.localeCompare(b.name);
    if (by === 'pool') return (a.pool || '').localeCompare(b.pool || '');
    if (by === 'state') return (a.state || '').localeCompare(b.state || '');
    if (by === 'wins') return b.wins - a.wins;
    return 0;
  });
  const tb = document.getElementById('teams-body');
  if (!tb) return;
  if (!arr.length) {
    tb.innerHTML = '<tr><td colspan="8" class="teams-empty">No teams added yet</td></tr>';
    document.getElementById('teams-sum').style.display = 'none';
    return;
  }
  tb.innerHTML = '';
  arr.forEach((t, i) => {
    const us = t.name.toLowerCase().includes('mindset');
    const inPool = t.pool === CFG.pool.id;
    const rb = t.rank ? `<span class="rdot${t.rank <= 3 ? ' t3' : ''}">${t.rank}</span>` : '<span class="dash">—</span>';
    const sb = t.seed ? `<span class="seed-num${inPool ? ' in-pool' : ''}">#${t.seed}</span>` : '<span class="dash">—</span>';
    const pb = t.pool ? `<span class="pool-tag${inPool ? ' in-pool' : ''}">${t.pool}</span>` : '<span class="dash">—</span>';
    const tr = document.createElement('tr');
    tr.className = 'tr' + (us ? ' us' : '') + (inPool ? ' in-pool-row' : '');
    tr.innerHTML = `<td>${rb}</td><td class="ctr">${sb}</td><td class="ctr">${pb}</td><td>${t.name}${us ? '<span class="us-badge">⭐</span>' : ''}</td>
      <td class="club-cell">${t.club || '—'}</td>
      <td class="ctr"><span class="wl w">${t.wins}</span></td>
      <td class="ctr"><span class="wl l">${t.losses}</span></td>
      <td><button class="delbtn" onclick="delTeam(${i})" aria-label="Delete team"><i class="ti ti-trash"></i></button></td>`;
    tb.appendChild(tr);
  });
  const states = new Set(D.teams.map((t) => t.state).filter(Boolean));
  const us = D.teams.find((t) => t.name.toLowerCase().includes('mindset'));
  document.getElementById('tcount').textContent = D.teams.length;
  document.getElementById('scount').textContent = states.size;
  document.getElementById('mrank').textContent = us?.rank ? `#${us.rank}` : '—';
  document.getElementById('teams-sum').style.display = 'flex';
}

function addTeam() {
  if (!editMode) return;
  const g = (id) => document.getElementById(id);
  const name = g('tn')?.value.trim();
  if (!name) { toast('Enter team name'); return; }
  D.teams.push({
    name,
    state: g('ts')?.value.trim().toUpperCase() || '',
    rank: parseInt(g('tr')?.value) || null,
    wins: parseInt(g('tw')?.value) || 0,
    losses: parseInt(g('tl')?.value) || 0,
    club: g('td')?.value.trim() || '',
  });
  ['tn', 'ts', 'tr', 'tw', 'tl', 'td'].forEach((id) => { const el = g(id); if (el) el.value = ''; });
  renderTeams();
  saveData();
  toast('Team added!');
}

function delTeam(i) { D.teams.splice(i, 1); renderTeams(); saveData(); }

function filterTeams() {
  const q = document.getElementById('team-search').value.toLowerCase();
  document.querySelectorAll('.tr').forEach((r) => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ── Players / staff / cheer grids ──────────────────────────────────
function buildProfiles() {
  const g = document.getElementById('pgrid');
  if (!g) return;
  g.innerHTML = '';
  PLAYERS.forEach((p) => {
    const pd = D.players[p.id] || {};
    const c = document.createElement('div');
    c.className = 'pcard';
    c.id = `pc-${p.id}`;
    c.innerHTML = `
      <div class="pwrap" id="pw-${p.id}">
        <div class="pph"><i class="ti ti-user-circle"></i><span>Tap to add photo</span></div>
        <button class="pupbtn" onclick="document.getElementById('pin-${p.id}').click()" aria-label="Upload photo"><i class="ti ti-camera"></i></button>
        <input type="file" id="pin-${p.id}" accept="image/*" class="hidden-input" onchange="uploadPhoto('${p.id}',this)">
      </div>
      <div class="pbody">
        <div class="pnum e" data-pf="num" data-pid="${p.id}">${pd.num || p.num}</div>
        <div class="pname e" data-pf="name" data-pid="${p.id}">${pd.name || p.name}</div>
        <div class="pstat"><span class="lbl">Position</span><span class="val e" data-pf="position" data-pid="${p.id}">${pd.position || p.pos}</span></div>
        <div class="pstat"><span class="lbl">Height</span><span class="val e" data-pf="height" data-pid="${p.id}">${pd.height || '—'}</span></div>
        <div class="pig"><i class="ti ti-brand-instagram"></i><span class="e ig-handle" data-pf="instagram" data-pid="${p.id}">${pd.instagram || '@instagram'}</span></div>
        <div class="rbox">
          <details class="reel-help">
            <summary><i class="ti ti-info-circle"></i> How to add your reel</summary>
            <div class="reel-help-body">
              <strong>From Hudl:</strong><br>
              1. Open your Hudl link<br>
              2. Click the download (↓) button<br>
              3. Save to your computer<br><br>
              <strong>Upload to YouTube:</strong><br>
              1. Go to youtube.com → sign in<br>
              2. Click + Create → Upload video<br>
              3. Set visibility to <strong>Unlisted</strong><br>
              4. Copy the YouTube URL<br>
              5. Paste it in Add Highlight Reel
            </div>
          </details>
          <div class="rph" id="rph-${p.id}" onclick="openReel('${p.id}','${p.name}')"><i class="ti ti-player-play-filled"></i><span>Add Highlight Reel</span></div>
          <div id="ract-${p.id}" class="ract">
            <div class="ract-row">
              <div class="ract-ic"><i class="ti ti-player-play-filled"></i></div>
              <div class="ract-meta"><div class="ract-title">${p.name} Highlights</div><div class="ract-sub">Tap to play / edit</div></div>
              <button class="ract-play" onclick="openReel('${p.id}','${p.name}')" aria-label="Play highlight reel"><i class="ti ti-player-play"></i></button>
            </div>
          </div>
        </div>
      </div>`;
    g.appendChild(c);
    if (pd.photo_url) {
      const th = pd.photo_url.replace('images/players/', 'images/players/thumbs/').replace(/\.(png|gif|webp)$/, '.jpg');
      setPhoto(p.id, th, pd.photo_url);
    }
    if (pd.reel_url) { playerReels[p.id] = { type: 'url', src: pd.reel_url }; updateReelUI(p.id); }
  });
  bindPlayerEditables(g);
}

function buildPersonGrid(gridId, people) {
  const g = document.getElementById(gridId);
  if (!g || !people.length) return;
  g.innerHTML = '';
  people.forEach((s) => {
    const pd = D.players[s.id] || {};
    const c = document.createElement('div');
    c.className = 'pcard';
    c.id = `pc-${s.id}`;
    c.innerHTML = `
      <div class="pwrap" id="pw-${s.id}">
        <div class="pph"><i class="ti ti-user-circle"></i><span>Tap to add photo</span></div>
        <button class="pupbtn" onclick="document.getElementById('pin-${s.id}').click()" aria-label="Upload photo"><i class="ti ti-camera"></i></button>
        <input type="file" id="pin-${s.id}" accept="image/*" class="hidden-input" onchange="uploadPhoto('${s.id}',this)">
      </div>
      <div class="pbody">
        <div class="prole">${s.role}</div>
        <div class="pname e" data-pf="name" data-pid="${s.id}">${pd.name || s.name}</div>
        <div class="pig"><i class="ti ti-brand-instagram"></i><span class="e ig-handle" data-pf="instagram" data-pid="${s.id}">${pd.instagram || '@instagram'}</span></div>
      </div>`;
    g.appendChild(c);
    if (pd.photo_url) {
      const th = pd.photo_url.replace('images/players/', 'images/players/thumbs/').replace(/\.(png|gif|webp)$/, '.jpg');
      setPhoto(s.id, th, pd.photo_url);
    }
  });
  bindPlayerEditables(g);
}

function buildStaffGrid() { buildPersonGrid('staff-grid', STAFF); }
function buildCheerleadersGrid() { buildPersonGrid('cheer-grid', CHEERLEADERS); }

// ── Photos ─────────────────────────────────────────────────────────
function resizeImage(dataUrl, maxPx, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxPx || h > maxPx) { const s = Math.min(maxPx / w, maxPx / h); w = Math.round(w * s); h = Math.round(h * s); }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function uploadPhoto(pid, input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    setPhoto(pid, e.target.result); // optimistic preview
    toast('Resizing photo…');
    const resized = await resizeImage(e.target.result, 1200, 0.82);
    const base64 = resized.split(',')[1];
    toast('Uploading photo…');
    try {
      const r = await fetch('/.netlify/functions/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, content: base64, extension: 'jpg' }),
      });
      const responseText = await r.text();
      if (!r.ok) throw new Error(responseText);
      const { url } = JSON.parse(responseText);
      if (!D.players[pid]) D.players[pid] = {};
      D.players[pid].photo_url = url;
      setPhoto(pid, url);
      saveData();
      toast('Photo saved!');
    } catch (err) {
      toast(`Photo upload failed — ${err.message}`);
    }
  };
  reader.readAsDataURL(file);
}

function setPhoto(pid, url, fullUrl) {
  const w = document.getElementById(`pw-${pid}`);
  if (!w) return;
  let img = w.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    img.alt = pid;
    img.className = 'pphoto';
    w.querySelector('.pph')?.remove();
    w.insertBefore(img, w.firstChild);
  }
  img.src = url;
  if (fullUrl) {
    img.srcset = `${url} 1x, ${fullUrl} 2x`;
    img.onerror = () => { img.onerror = null; img.src = fullUrl; };
  }
}

// ── Player reels ───────────────────────────────────────────────────
function openReel(pid, name) {
  activeReelPid = pid;
  document.getElementById('reel-modal-title').textContent = `${name} — Highlight Reel`;
  const r = playerReels[pid];
  const vw = document.getElementById('reel-vw'), ri = document.getElementById('reel-iframe');
  const ui = document.getElementById('reel-url-in'), cb = document.getElementById('reel-clear-btn');
  if (r) { ui.value = r.src || ''; vw.style.display = 'block'; ri.src = toEmbed(r.src) || ''; cb.style.display = 'block'; }
  else { ui.value = ''; vw.style.display = 'none'; ri.src = ''; cb.style.display = 'none'; }
  document.getElementById('reel-modal').style.display = 'flex';
}

function closeReel() {
  document.getElementById('reel-modal').style.display = 'none';
  document.getElementById('reel-iframe').src = '';
}

function saveReelUrl() {
  const url = document.getElementById('reel-url-in').value.trim();
  if (!url || !activeReelPid) return;
  playerReels[activeReelPid] = { type: 'url', src: url };
  if (!D.players[activeReelPid]) D.players[activeReelPid] = {};
  D.players[activeReelPid].reel_url = url;
  updateReelUI(activeReelPid);
  closeReel();
  saveData();
  toast('Reel saved!');
}

function saveReelFile(input) {
  if (!input.files?.[0] || !activeReelPid) return;
  playerReels[activeReelPid] = { type: 'file', src: URL.createObjectURL(input.files[0]) };
  updateReelUI(activeReelPid);
  closeReel();
  toast('Reel loaded (link it on YouTube for permanent storage)');
}

function clearReel() {
  if (!activeReelPid) return;
  delete playerReels[activeReelPid];
  if (D.players[activeReelPid]) D.players[activeReelPid].reel_url = '';
  updateReelUI(activeReelPid);
  saveData();
}

function updateReelUI(pid) {
  const ph = document.getElementById(`rph-${pid}`), ac = document.getElementById(`ract-${pid}`);
  if (!ph || !ac) return;
  if (playerReels[pid]) { ph.style.display = 'none'; ac.style.display = 'block'; }
  else { ph.style.display = 'flex'; ac.style.display = 'none'; }
}

function toEmbed(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
  m = url.match(/vimeo\.com\/([0-9]+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  if (url.includes('hudl.com')) return url.replace('/video/', '/embed/');
  if (url.startsWith('http')) return url;
  return null;
}

// ── Gallery slots (legacy add-photo grid) ──────────────────────────
let sc = 0;
const slotMarkup = (id) => `<div class="gh"><i class="ti ti-camera-plus"></i><span>Add photo</span></div><input type="file" accept="image/*"><button class="gdel" onclick="rmSlot('${id}',event)" aria-label="Remove photo"><i class="ti ti-x"></i></button>`;

function wireSlot(el, id) {
  el.querySelector('input').addEventListener('change', function () {
    if (this.files?.[0]) {
      const r = new FileReader();
      r.onload = (ev) => {
        el.innerHTML = `<img src="${ev.target.result}" alt=""><button class="gdel" onclick="rmSlot('${id}',event)" aria-label="Remove photo"><i class="ti ti-x"></i></button>`;
        el.classList.add('has');
      };
      r.readAsDataURL(this.files[0]);
    }
  });
}

function makeSlot() {
  sc++;
  const id = `gs${sc}`;
  const w = document.createElement('div');
  w.className = 'gslot';
  w.id = id;
  w.innerHTML = slotMarkup(id);
  wireSlot(w, id);
  return w;
}

function addSlots(n) {
  const g = document.getElementById('gallery');
  for (let i = 0; i < n; i++) g.appendChild(makeSlot());
}

function rmSlot(id, e) {
  e.stopPropagation();
  const s = document.getElementById(id);
  s.className = 'gslot';
  s.innerHTML = slotMarkup(id);
  wireSlot(s, id);
}

// ── Auth / edit mode ───────────────────────────────────────────────
function promptEdit() {
  if (editMode) { disableEdit(); return; }
  document.getElementById('lock-pw').value = '';
  document.getElementById('lock-err').style.display = 'none';
  document.getElementById('lock-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('lock-pw').focus(), 80);
}

function checkPw() {
  if (document.getElementById('lock-pw').value === EDIT_PW) {
    document.getElementById('lock-overlay').style.display = 'none';
    enableEdit();
  } else {
    document.getElementById('lock-err').style.display = 'block';
    document.getElementById('lock-pw').value = '';
    document.getElementById('lock-pw').focus();
  }
}

function enableEdit() {
  editMode = true;
  document.body.classList.add('em');
  const b = document.getElementById('edit-btn');
  b.classList.add('on');
  b.innerHTML = '<i class="ti ti-lock-open"></i> Editing';
  [2, 3, 4].forEach((d) => { const ub = document.getElementById(`ubtn${d}`); if (ub) ub.disabled = false; });
  document.querySelectorAll('[data-key], [data-pf]').forEach((el) => { el.contentEditable = 'true'; });
  document.querySelectorAll('.psc').forEach((el) => { el.disabled = false; });
  document.querySelectorAll('.pres-sel').forEach((el) => { el.disabled = false; el.style.display = ''; });
  document.querySelectorAll('.scout-edit').forEach((el) => { el.style.display = 'flex'; });
  document.querySelectorAll('.scout-link').forEach((el) => { el.style.display = 'none'; });
  toast('Edit mode on — changes save automatically');
}

function disableEdit() {
  editMode = false;
  document.body.classList.remove('em');
  const b = document.getElementById('edit-btn');
  b.classList.remove('on');
  b.innerHTML = '<i class="ti ti-lock"></i> Edit';
  document.querySelectorAll('[data-key], [data-pf]').forEach((el) => { el.contentEditable = 'false'; });
  document.querySelectorAll('.psc').forEach((el) => { el.disabled = true; });
  document.querySelectorAll('.pres-sel').forEach((el) => { el.disabled = true; el.style.display = 'none'; });
  document.querySelectorAll('.scout-edit').forEach((el) => { el.style.display = 'none'; });
  renderPoolSchedule();
  toast('Edit mode off');
}

// ── Tabs ───────────────────────────────────────────────────────────
function switchTab(name) {
  const btn = document.querySelector(`.tab[data-tab="${name}"]`);
  if (!btn) { if (name !== 'schedule') switchTab('schedule'); return; }
  // Tear down any listeners registered by the tab we're leaving.
  tabCleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  tabCleanups = [];
  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
  document.querySelectorAll('.sec').forEach((x) => x.classList.remove('on'));
  btn.classList.add('active');
  document.getElementById(`tab-${name}`)?.classList.add('on');
  const enter = tabEnter[name];
  if (enter) { const cleanup = enter(); if (typeof cleanup === 'function') tabCleanups.push(cleanup); }
}

function setupTabs() {
  document.querySelectorAll('.tab[data-tab]').forEach((t) => t.addEventListener('click', () => {
    history.pushState(null, '', `#${t.dataset.tab}`);
    switchTab(t.dataset.tab);
  }));
  window.addEventListener('popstate', () => switchTab(location.hash.slice(1) || 'schedule'));
}

function setupDayTabs() {
  document.querySelectorAll('.dtab').forEach((t) => t.addEventListener('click', () => {
    if (t.classList.contains('locked')) return;
    document.querySelectorAll('.dtab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.dpanel').forEach((x) => x.classList.remove('on'));
    t.classList.add('active');
    document.getElementById(`dp${t.dataset.day}`).classList.add('on');
  }));
}

// Re-render the teams table whenever its tab is opened (idempotent).
Hub.onTabEnter('teams', renderTeams);

// ── Utils ──────────────────────────────────────────────────────────
function copyTxt(t) { navigator.clipboard.writeText(t).catch(() => {}); toast(`Copied: ${t}`); }

let _toastTimer = null;
let _toastDismiss = null;
function toast(msg) {
  const t = document.getElementById('toast');
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  if (_toastDismiss) { t.removeEventListener('click', _toastDismiss); _toastDismiss = null; }
  t.textContent = msg;
  t.classList.add('on');
  _toastDismiss = () => {
    t.classList.remove('on');
    t.removeEventListener('click', _toastDismiss);
    _toastDismiss = null;
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  };
  t.addEventListener('click', _toastDismiss);
  _toastTimer = setTimeout(_toastDismiss, 25000);
}

function flashSaved() {
  const s = document.getElementById('saved');
  s.classList.add('on');
  clearTimeout(window._st);
  window._st = setTimeout(() => s.classList.remove('on'), 2200);
}

function loading(on) {
  const b = document.getElementById('lbar');
  b.style.width = on ? '65%' : '100%';
  if (!on) setTimeout(() => { b.style.width = '0'; }, 400);
}

function weatherEmoji(code) {
  if (code <= 1) return '☀️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌤️';
}

async function fetchWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER.lat}&longitude=${WEATHER.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=${encodeURIComponent(WEATHER.tz)}&forecast_days=5`;
    const r = await fetch(url);
    if (!r.ok) return;
    const data = await r.json();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const el = document.getElementById('wx-mini');
    if (!el) return;
    el.innerHTML = data.daily.time.map((t, i) => {
      const day = days[new Date(`${t}T12:00:00`).getDay()];
      const em = weatherEmoji(data.daily.weathercode[i]);
      const hi = Math.round(data.daily.temperature_2m_max[i]);
      const lo = Math.round(data.daily.temperature_2m_min[i]);
      return `<div class="wxd"><span class="wxday">${day}</span><span class="wxem">${em}</span><span class="wxtemp">${hi}°/${lo}°</span></div>`;
    }).join('');
    const bar = document.getElementById('wx-bar-strip');
    if (bar && data.daily.time.length) {
      bar.innerHTML = data.daily.time.slice(0, 3).map((t, i) => {
        const lbl = i === 0 ? 'Today' : days[new Date(`${t}T12:00:00`).getDay()];
        const em = weatherEmoji(data.daily.weathercode[i]);
        const hi = Math.round(data.daily.temperature_2m_max[i]);
        const lo = Math.round(data.daily.temperature_2m_min[i]);
        return `<div class="wx-bar-day"><span class="wbd-lbl">${lbl}</span><span class="wbd-em">${em}</span><span class="wbd-tmp">${hi}°/${lo}°</span></div>`;
      }).join('');
    }
  } catch { /* ignore */ }
}

function countdown() {
  const pad = (n) => String(n).padStart(2, '0');
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const tick = () => {
    const d = new Date(FIRST_SERVE) - new Date();
    if (d <= 0) {
      const gt = '<span class="cd-gametime">GAME TIME!</span>';
      const m = document.getElementById('cd-mini'); if (m) m.innerHTML = gt;
      const mm = document.getElementById('cd-mini-m'); if (mm) mm.innerHTML = gt;
      return;
    }
    const dy = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
    set('cd-d', pad(dy)); set('cd-h', pad(h)); set('cd-m', pad(m)); set('cd-s', pad(s));
    set('cd-d-m', pad(dy)); set('cd-h-m', pad(h)); set('cd-m-m-val', pad(m)); set('cd-s-m-val', pad(s));
  };
  tick();
  setInterval(tick, 1000);
}

// ── Pool play (schedule + standings + scout videos) ────────────────
function renderPoolSchedule() {
  if (!D.matches.pool) D.matches.pool = [0, 1, 2, 3, 4].map(() => ({ scores: [['', ''], ['', ''], ['', '']], result: 'pending' }));
  const pm = D.matches.pool;
  document.querySelectorAll('.psc').forEach((el) => {
    const mi = +el.dataset.pmatch, si = +el.dataset.pset, side = el.dataset.pside;
    const arr = pm[mi]?.scores?.[si];
    const val = arr ? arr[side === 'us' ? 0 : 1] : '';
    el.value = (val !== '' && val !== undefined && val !== null) ? val : ''; // empty → '—' placeholder
  });
  for (let i = 0; i < 5; i++) {
    const sel = document.getElementById(`pres-${i}`);
    const badge = document.getElementById(`pbadge-${i}`);
    const res = pm[i]?.result || 'pending';
    if (sel) sel.value = res;
    if (badge) { badge.textContent = res === 'W' ? 'W' : res === 'L' ? 'L' : 'Pending'; badge.className = 'pres-badge ' + (res === 'W' ? 'win' : res === 'L' ? 'loss' : 'pending'); }
  }
  updatePoolRecord();
  renderPoolStandings();
  for (let i = 0; i < 5; i++) {
    const sl = document.getElementById(`scout-link-${i}`);
    const si = document.getElementById(`scout-url-${i}`);
    const url = pm[i]?.scoutVideo || '';
    if (sl) { sl.href = url; sl.style.display = url ? 'inline' : 'none'; }
    if (si) si.value = url;
  }
}

function updatePoolRecord() {
  const pm = D.matches.pool || [];
  let w = 0, l = 0, pend = 0;
  pm.forEach((m) => { if (m.result === 'W') w++; else if (m.result === 'L') l++; else pend++; });
  const rec = document.getElementById('pool-record');
  const plab = document.getElementById('pool-pending-lbl');
  if (rec) rec.textContent = `${w}–${l}`;
  if (plab) plab.textContent = pend > 0 ? `${pend} pending` : (w + l === 5 ? 'Complete!' : '');
}

function renderPoolStandings() {
  const tb = document.getElementById('pool-standings-tbody');
  if (!tb) return;
  const { prefix, teams, mindsetSeed } = CFG.pool;
  const pm = D.matches.pool || [];
  let mw = 0, ml = 0;
  pm.forEach((m) => { if (m.result === 'W') mw++; else if (m.result === 'L') ml++; });
  const rows = teams.map((t, i) => {
    const isMindset = t.seed === mindsetSeed;
    const w = isMindset ? mw : +(D.hub[`${prefix}w_${i}`] || 0);
    const l = isMindset ? ml : +(D.hub[`${prefix}l_${i}`] || 0);
    return { t, i, w, l, isMindset };
  }).sort((a, b) => b.w - a.w || a.l - b.l);
  tb.innerHTML = rows.map(({ t, i, w, l, isMindset }) => `
    <tr class="pool-row${isMindset ? ' mindset' : ''}">
      <td class="pool-seed">#${t.seed}</td>
      <td class="pool-team${isMindset ? ' mindset' : ''}">${isMindset ? '⭐ ' : ''}${t.name}</td>
      <td class="pool-wl">${isMindset ? `<span class="wl w">${w}</span>` : `<span class="wl w e" data-key="${prefix}w_${i}" contenteditable="false">${w}</span>`}</td>
      <td class="pool-wl">${isMindset ? `<span class="wl l">${l}</span>` : `<span class="wl l e" data-key="${prefix}l_${i}" contenteditable="false">${l}</span>`}</td>
    </tr>`).join('');
  bindEditables(tb);
}

function bindPoolSchedule() {
  document.querySelectorAll('.psc').forEach((el) => {
    if (el._peb) return;
    el._peb = true;
    // Each input writes ONLY its own side's index — never the other team's cell.
    const commit = () => {
      if (!editMode) return;
      const mi = +el.dataset.pmatch, si = +el.dataset.pset, side = el.dataset.pside;
      if (!D.matches.pool[mi]) return;
      const v = el.value.replace(/[^0-9]/g, '');
      if (el.value !== v) el.value = v; // strip any non-digits in place
      D.matches.pool[mi].scores[si][side === 'us' ? 0 : 1] = v;
      saveData();
    };
    el.addEventListener('input', commit);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });
  document.querySelectorAll('.pres-sel').forEach((sel) => {
    if (sel._peb) return;
    sel._peb = true;
    sel.addEventListener('change', () => {
      if (!editMode) return;
      const mi = +sel.dataset.pmatch;
      D.matches.pool[mi].result = sel.value;
      const badge = document.getElementById(`pbadge-${mi}`);
      if (badge) { badge.textContent = sel.value === 'W' ? 'W' : sel.value === 'L' ? 'L' : 'Pending'; badge.className = 'pres-badge ' + (sel.value === 'W' ? 'win' : sel.value === 'L' ? 'loss' : 'pending'); }
      updatePoolRecord();
      renderPoolStandings();
      saveData();
    });
  });
}

function saveScoutVideo(mi) {
  const inp = document.getElementById(`scout-url-${mi}`);
  if (!inp) return;
  const url = inp.value.trim();
  if (!D.matches.pool[mi]) D.matches.pool[mi] = {};
  D.matches.pool[mi].scoutVideo = url;
  const sl = document.getElementById(`scout-link-${mi}`);
  if (sl) { sl.href = url; sl.style.display = url ? 'inline' : 'none'; }
  saveData();
  toast('Scout video saved');
}

// ── Expose handlers referenced by inline onclick/onchange ──────────
Object.assign(window, {
  addMatch, addTeam, checkPw, clearReel, closeReel, copyTxt, delMatch, delTeam,
  filterTeams, openReel, promptEdit, renderTeams, rmSlot, saveReelFile, saveReelUrl,
  saveScoutVideo, unlockDay, uploadPhoto, switchTab, addSlots,
});
