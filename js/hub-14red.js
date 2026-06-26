// ═══════════════════════════════════════════════════════════════════
//  hub-14red.js — Premier 14 Red plugin
//  Adds: Reels theater · Fundraising thermometer + log · Donor thanks
//  Loaded AFTER hub.js; hooks in through window.Hub.
// ═══════════════════════════════════════════════════════════════════
(() => {
  const Hub = window.Hub;
  if (!Hub) return;

  const $ = (id) => document.getElementById(id);

  // ── Reels theater (lazy-init the first time the Reels tab opens) ──
  let reelsLoaded = false;

  function initReels() {
    if (reelsLoaded) return;
    reelsLoaded = true;

    const VIDEOS = (Hub.data.videos || []).map((v) => {
      const m = v.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      if (!m) return null;
      const dashIdx = v.title.indexOf(' - ');
      return {
        id: m[1],
        title: dashIdx > -1 ? v.title.slice(0, dashIdx) : v.title,
        sub: dashIdx > -1 ? v.title.slice(dashIdx + 3) : '',
        thumb: v.thumbnail,
      };
    }).filter(Boolean);

    const stage = $('theater-stage');
    const iframe = $('theater-iframe');
    const poster = $('theater-poster');
    const posterImg = $('theater-poster-img');
    const bigPlay = $('theater-play');
    const fsBtn = $('theater-fs');
    const titleEl = $('theater-title');
    const subEl = $('theater-sub');
    const list = $('reel-list');
    const countEl = $('theater-count');
    if (!stage || !list) return;

    let active = 0;
    let playing = false;

    const emb = (v) => `https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`;

    const renderList = () => {
      list.innerHTML = VIDEOS.map((v, i) => {
        const cls = 'reel-row' + (i === active ? ' active' : '');
        return `<button class="${cls}" data-i="${i}">` +
          `<span class="reel-row-thumb"><img loading="lazy" src="${v.thumb}" alt="">` +
          '<span class="rr-play"><i class="ti ti-player-play-filled"></i></span>' +
          (i === active ? '<span class="rr-eq"><span></span><span></span><span></span></span>' : '') +
          '</span><span class="reel-row-info">' +
          `<span class="reel-row-title">${v.title}</span>` +
          `<span class="reel-row-sub">${v.sub}</span>` +
          '</span></button>';
      }).join('');
    };

    const select = (i, play) => {
      active = i;
      const v = VIDEOS[i];
      renderList();
      if (titleEl) titleEl.textContent = v.title;
      if (subEl) subEl.textContent = v.sub;
      if (posterImg) posterImg.src = v.thumb;
      if (play) {
        iframe.src = emb(v);
        if (poster) poster.style.display = 'none';
        stage.classList.add('playing');
        playing = true;
      } else if (!playing) {
        if (poster) poster.style.display = '';
        iframe.src = '';
      } else {
        iframe.src = emb(v);
      }
    };

    if (countEl) countEl.textContent = `${VIDEOS.length}${VIDEOS.length === 1 ? ' video' : ' videos'}`;
    select(0, false);

    list.addEventListener('click', (e) => {
      const row = e.target.closest('.reel-row');
      if (!row) return;
      select(parseInt(row.getAttribute('data-i'), 10), true);
      if (window.matchMedia('(max-width:640px)').matches) {
        const top = stage.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: top < 0 ? 0 : top, behavior: 'smooth' });
      }
    });

    if (bigPlay) bigPlay.addEventListener('click', () => select(active, true));
    if (poster) poster.addEventListener('click', () => select(active, true));

    if (fsBtn) fsBtn.addEventListener('click', () => {
      const el = stage;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (iframe.webkitEnterFullscreen) iframe.webkitEnterFullscreen();
    });
  }

  Hub.onTabEnter('reels', initReels);

  // ── Fundraising ──────────────────────────────────────────────────
  const getFundGoal = () => Hub.data.fundraising?.goal || 5000;
  const getFundEntries = () => Hub.data.fundraising?.entries || [];
  const getFundTotal = () => getFundEntries().reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  function renderFundraising() {
    const goal = getFundGoal();
    const total = getFundTotal();
    const pct = Math.min(100, Math.round((total / goal) * 100));

    const amtEl = $('thermo-amount');
    const pctEl = $('thermo-pct');
    const tgtEl = document.querySelector('.meter-target');
    const barEl = $('thermo-bar');
    const subEl = $('thermo-sub');

    if (amtEl) amtEl.textContent = `$${total.toLocaleString()}`;
    if (pctEl) pctEl.textContent = `${pct}% of goal`;
    if (tgtEl) tgtEl.textContent = `of $${goal.toLocaleString()}`;
    if (barEl) barEl.style.width = `${pct}%`;
    if (subEl) subEl.innerHTML = `<strong>$${Math.max(0, goal - total).toLocaleString()}</strong> remaining to goal`;

    renderFundLog();
  }

  function renderFundLog() {
    const body = $('flog-body');
    if (!body) return;
    const entries = getFundEntries().slice().reverse(); // newest first
    if (!entries.length) {
      body.innerHTML = '<div class="flog-empty">No entries yet.</div>';
      return;
    }
    body.innerHTML = entries.map((e, i) => {
      const origIdx = getFundEntries().length - 1 - i; // index in original array
      const delBtn = `<button class="delbtn" onclick="deleteFundEntry(${origIdx})" title="Delete"><i class="ti ti-trash"></i></button>`;
      return `<div class="flog-entry">
        <div class="flog-entry-info">
          <div class="flog-entry-name">${e.name || 'Event'}</div>
          <div class="flog-entry-date">${e.date || ''}</div>
        </div>
        <span class="flog-entry-amt">+$${(parseFloat(e.amount) || 0).toLocaleString()}</span>
        ${delBtn}
      </div>`;
    }).join('');
  }

  function addFundEntry() {
    const D = Hub.data;
    const nameIn = $('flog-name-in');
    const amtIn = $('flog-amt-in');
    const name = nameIn?.value.trim() || 'Event';
    const amount = parseFloat(amtIn?.value) || 0;
    if (amount <= 0) { Hub.toast('Enter an amount greater than $0'); return; }
    if (!D.fundraising) D.fundraising = { goal: 5000, entries: [] };
    if (!D.fundraising.entries) D.fundraising.entries = [];
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    D.fundraising.entries.push({ name, amount, date });
    if (nameIn) nameIn.value = '';
    if (amtIn) amtIn.value = '';
    renderFundraising();
    Hub.save();
    Hub.toast('Entry added!');
  }

  function deleteFundEntry(idx) {
    const D = Hub.data;
    if (!D.fundraising || !D.fundraising.entries) return;
    D.fundraising.entries.splice(idx, 1);
    renderFundraising();
    Hub.save();
    Hub.toast('Entry deleted.');
  }

  // ── Donor thanks ─────────────────────────────────────────────────
  function renderDonorThanks() {
    const text = Hub.data.hub?.donor_thanks || '';
    const ta = $('donor-textarea');
    const disp = $('donor-display');
    if (ta) ta.value = text;
    if (!disp) return;
    if (text.trim()) {
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      let intro = '';
      const names = [];
      lines.forEach((l) => {
        if (/thank/i.test(l) && l.length > 20) intro = l;
        else names.push(l);
      });
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let html = '';
      if (intro) html += `<p class="donor-intro">${esc(intro)}</p>`;
      if (names.length) {
        html += '<div class="donor-grid">' + names.map((n) =>
          `<span class="donor-chip"><i class="ti ti-heart-filled"></i>${esc(n)}</span>`,
        ).join('') + '</div>';
      }
      disp.classList.remove('empty');
      disp.innerHTML = html;
    } else {
      disp.innerHTML = '<span class="empty">Donor recognition will appear here.</span>';
    }
  }

  function saveDonorThanks() {
    const D = Hub.data;
    const ta = $('donor-textarea');
    const text = ta ? ta.value : '';
    if (!D.hub) D.hub = {};
    D.hub.donor_thanks = text;
    renderDonorThanks();
    Hub.save();
    Hub.toast('Donor recognition saved!');
  }

  Hub.onRender(() => { renderFundraising(); renderDonorThanks(); });
  Hub.expose({ addFundEntry, deleteFundEntry, saveDonorThanks });
})();
