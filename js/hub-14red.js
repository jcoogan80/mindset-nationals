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

  Hub.onTabEnter('meals', () => {
    renderMeals();
    const obs = new MutationObserver(() => renderMealCreateForm());
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  });

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

  Hub.onRender(() => { renderFundraising(); renderDonorThanks(); renderRound2Schedule(); renderMeals(); });
  Hub.expose({ addFundEntry, deleteFundEntry, saveDonorThanks, saveScoutVideoR2, openMealOrderModal, closeMealOrderModal, openMealAdminModal, closeMealAdminModal, mealQtyChange, submitMealOrder, mealMarkPaid, mealSaveBillInfo, mealToggleStatus, mealDeleteEvent, mealAddItem, mealCreateEvent });

  // ── Round 2 Schedule ─────────────────────────────────────────────
  function getR2() {
    if (!Hub.data.matches) Hub.data.matches = {};
    if (!Hub.data.matches.round2) {
      Hub.data.matches.round2 = [
        { scores: [['', ''], ['', ''], ['', '']], result: 'pending', scoutVideo: '' },
        { scores: [['', ''], ['', ''], ['', '']], result: 'pending', scoutVideo: '' },
      ];
    }
    return Hub.data.matches.round2;
  }

  function renderRound2Schedule() {
    const r2 = getR2();
    document.querySelectorAll('.r2psc').forEach((el) => {
      const mi = +el.dataset.r2match, si = +el.dataset.pset, side = el.dataset.pside;
      const arr = r2[mi]?.scores?.[si];
      const v = arr ? arr[side === 'us' ? 0 : 1] : '';
      el.value = (v !== '' && v !== undefined && v !== null) ? v : '';
    });
    for (let i = 0; i < 2; i++) {
      const sel = $(`r2res-${i}`);
      const badge = $(`r2badge-${i}`);
      const res = r2[i]?.result || 'pending';
      if (sel) sel.value = res;
      if (badge) { badge.textContent = res === 'W' ? 'W' : res === 'L' ? 'L' : 'Pending'; badge.className = 'pres-badge ' + (res === 'W' ? 'win' : res === 'L' ? 'loss' : 'pending'); }
      const sl = $(`r2scout-link-${i}`);
      const su = $(`r2scout-url-${i}`);
      const url = r2[i]?.scoutVideo || '';
      if (sl) { sl.href = url; sl.style.display = (url && !Hub.editMode) ? 'inline' : 'none'; }
      if (su) su.value = url;
    }
  }

  function bindRound2Schedule() {
    document.querySelectorAll('.r2psc').forEach((el) => {
      if (el._r2eb) return;
      el._r2eb = true;
      const commit = () => {
        if (!Hub.editMode) return;
        const mi = +el.dataset.r2match, si = +el.dataset.pset, side = el.dataset.pside;
        const r2 = getR2();
        if (!r2[mi]) return;
        const v = el.value.replace(/[^0-9]/g, '');
        if (el.value !== v) el.value = v;
        r2[mi].scores[si][side === 'us' ? 0 : 1] = v;
        Hub.save();
      };
      el.addEventListener('input', commit);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    });
    document.querySelectorAll('.r2pres-sel').forEach((sel) => {
      if (sel._r2eb) return;
      sel._r2eb = true;
      sel.addEventListener('change', () => {
        if (!Hub.editMode) return;
        const mi = +sel.dataset.r2match;
        const r2 = getR2();
        r2[mi].result = sel.value;
        const badge = $(`r2badge-${mi}`);
        if (badge) { badge.textContent = sel.value === 'W' ? 'W' : sel.value === 'L' ? 'L' : 'Pending'; badge.className = 'pres-badge ' + (sel.value === 'W' ? 'win' : sel.value === 'L' ? 'loss' : 'pending'); }
        Hub.save();
      });
    });
  }

  function updateR2EditState() {
    const em = Hub.editMode;
    document.querySelectorAll('.r2psc').forEach((el) => { el.disabled = !em; });
    document.querySelectorAll('.r2pres-sel').forEach((el) => { el.disabled = !em; el.style.display = em ? '' : 'none'; });
    document.querySelectorAll('.r2scout-edit').forEach((el) => { el.style.display = em ? 'flex' : 'none'; });
    document.querySelectorAll('.r2scout-link').forEach((el) => { if (em) el.style.display = 'none'; });
    if (!em) renderRound2Schedule();
  }

  function saveScoutVideoR2(mi) {
    const inp = $(`r2scout-url-${mi}`);
    if (!inp) return;
    const url = inp.value.trim();
    const r2 = getR2();
    if (!r2[mi]) return;
    r2[mi].scoutVideo = url;
    const sl = $(`r2scout-link-${mi}`);
    if (sl) { sl.href = url; sl.style.display = url ? 'inline' : 'none'; }
    Hub.save();
    Hub.toast('Scout video saved');
  }

  Hub.onBoot(() => {
    renderRound2Schedule();
    bindRound2Schedule();
    // Mirror edit-mode state onto r2 inputs whenever body.em class toggles
    new MutationObserver(() => updateR2EditState())
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  });
  // ── Meals ────────────────────────────────────────────────────────
  function getMeals() {
    if (!Hub.data.meals) Hub.data.meals = { events: [] };
    if (!Array.isArray(Hub.data.meals.events)) Hub.data.meals.events = [];
    return Hub.data.meals;
  }

  function mealFmt(n) { return '$' + (parseFloat(n) || 0).toFixed(2); }

  function slugify(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '-'); }

  function renderMeals() {
    renderMealSummary();
    renderMealEventsList();
    renderMealBalanceTracker();
    renderMealCreateForm();
  }

  function renderMealSummary() {
    const events = getMeals().events;
    let totalSpent = 0, outstanding = 0;
    const familiesSet = new Set();
    events.forEach(ev => {
      (ev.orders || []).forEach(ord => {
        totalSpent += parseFloat(ord.total) || 0;
        if (!ord.paid) outstanding += parseFloat(ord.total) || 0;
        familiesSet.add(ord.family);
      });
    });
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('meals-total-spent', mealFmt(totalSpent));
    el('meals-outstanding', mealFmt(outstanding));
    el('meals-families-ordered', familiesSet.size);
  }

  function renderMealEventsList() {
    const list = document.getElementById('meals-events-list');
    if (!list) return;
    const events = getMeals().events;
    if (!events.length) {
      list.innerHTML = '<div style="text-align:center;padding:2rem 1rem;color:var(--gray);font-size:.82rem"><i class="ti ti-calendar-off" style="font-size:1.8rem;display:block;margin-bottom:.5rem;color:#ccc"></i>No meal events yet.' + (Hub.editMode ? ' Create one below.' : '') + '</div>';
      return;
    }
    list.innerHTML = events.map((ev) => {
      const deadline = ev.deadline ? new Date(ev.deadline) : null;
      const now = new Date();
      const isOpen = ev.status === 'open' && (!deadline || deadline > now);
      const orderCount = (ev.orders || []).length;
      const alreadySubmitted = !!localStorage.getItem('meal_submitted_' + ev.id);
      const deadlineStr = deadline ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + deadline.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
      return '<div class="meals-event-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;flex-wrap:wrap">' +
          '<div style="flex:1;min-width:0">' +
            '<div class="meals-event-name">' + ev.name + '</div>' +
            '<div class="meals-event-meta">' +
              '<span><i class="ti ti-building-store" style="margin-right:.18rem"></i>' + (ev.restaurant || '—') + '</span>' +
              (deadlineStr ? '<span style="color:var(--lightgray)">·</span><span><i class="ti ti-clock" style="margin-right:.18rem"></i>Order by ' + deadlineStr + '</span>' : '') +
            '</div>' +
            (ev.menuLink ? '<a href="' + ev.menuLink + '" target="_blank" rel="noopener" style="font-size:.74rem;color:var(--red);text-decoration:none">📋 View Full Menu →</a>' : '') +
          '</div>' +
          '<span class="meals-status ' + (isOpen ? 'open' : 'closed') + '">' + (isOpen ? '🟢 Ordering Open' : '🔴 Orders Closed') + '</span>' +
        '</div>' +
        '<div style="font-size:.74rem;color:var(--gray);margin-top:.42rem">' + orderCount + ' order' + (orderCount !== 1 ? 's' : '') + ' submitted</div>' +
        '<div class="meals-event-btns">' +
          (isOpen ? '<button class="meals-btn meals-btn-order" onclick="openMealOrderModal(\'' + ev.id + '\')"' + (alreadySubmitted ? ' disabled' : '') + '>' + (alreadySubmitted ? '✅ Submitted' : '🍽️ Place Your Order') + '</button>' : '') +
          (Hub.editMode ? '<button class="meals-btn meals-btn-view" onclick="openMealAdminModal(\'' + ev.id + '\')"><i class="ti ti-eye"></i> View Orders</button>' +
            '<button class="meals-btn meals-btn-view" onclick="mealToggleStatus(\'' + ev.id + '\')"><i class="ti ti-lock' + (isOpen ? '' : '-open') + '"></i> ' + (isOpen ? 'Close Ordering' : 'Reopen') + '</button>' +
            '<button class="meals-btn" style="background:#fff;border:1px solid var(--red);color:var(--red)" onclick="mealDeleteEvent(\'' + ev.id + '\')"><i class="ti ti-trash"></i></button>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderMealCreateForm() {
    const form = document.getElementById('meals-create-form');
    if (!form) return;
    form.style.display = Hub.editMode ? '' : 'none';
    const items = document.getElementById('meal-new-items');
    if (items && !items.children.length) mealAddItem();
  }

  function renderMealBalanceTracker() {
    const tbl = document.getElementById('meals-balance-table');
    if (!tbl) return;
    const events = getMeals().events;
    const ordered = {}, paidMap = {};
    events.forEach(ev => {
      (ev.orders || []).forEach(ord => {
        ordered[ord.family] = (ordered[ord.family] || 0) + (parseFloat(ord.total) || 0);
        if (ord.paid) paidMap[ord.family] = (paidMap[ord.family] || 0) + (parseFloat(ord.total) || 0);
      });
    });
    const families = Object.keys(ordered);
    if (!families.length) {
      tbl.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--gray);font-size:.78rem;background:#fff;border-radius:10px;border:1px solid var(--lightgray)">No orders yet — balances will appear here.</div>';
      return;
    }
    tbl.innerHTML = '<div style="overflow-x:auto"><table class="meals-balance-tbl"><thead><tr><th>Family</th><th>Total Ordered</th><th>Total Paid</th><th>Balance</th></tr></thead><tbody>' +
      families.map(f => {
        const o = ordered[f] || 0, p = paidMap[f] || 0, bal = p - o;
        const cls = bal > 0.005 ? 'bal-pos' : bal < -0.005 ? 'bal-neg' : '';
        const balStr = (bal >= 0 ? '+' : '') + mealFmt(Math.abs(bal));
        const balNote = bal < -0.005 ? ' <span style="font-size:.62rem;font-weight:400">owes</span>' : bal > 0.005 ? ' <span style="font-size:.62rem;font-weight:400">credit</span>' : '';
        return '<tr><td>' + f + '</td><td>' + mealFmt(o) + '</td><td>' + mealFmt(p) + '</td><td class="' + cls + '">' + balStr + balNote + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  // ── Order Quantities State ─────────────────────────────────────────
  let _activeMealId = null;
  const _qtyMap = {};

  function openMealOrderModal(mealId) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev) return;
    _activeMealId = mealId;
    Object.keys(_qtyMap).forEach(k => delete _qtyMap[k]);
    const modal = document.getElementById('meals-order-modal');
    const body = document.getElementById('meals-order-modal-body');
    if (!modal || !body) return;
    const items = ev.menuItems || [];
    const cats = {};
    items.forEach(it => { (cats[it.category] = cats[it.category] || []).push(it); });
    let itemsHtml = '';
    if (items.length) {
      Object.keys(cats).forEach(cat => {
        itemsHtml += '<div style="font-size:.6rem;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--gray);margin:.75rem 0 .2rem">' + cat + '</div>';
        cats[cat].forEach(it => {
          const sid = slugify(it.name);
          itemsHtml += '<div class="meal-menu-item-row">' +
            '<span style="font-size:.84rem">' + it.name + '</span>' +
            '<span style="font-size:.8rem;color:var(--green);font-weight:600;white-space:nowrap">' + mealFmt(it.price) + '</span>' +
            '<button class="meals-qty-btn" onclick="mealQtyChange(\'' + mealId + '\',\'' + it.name.replace(/'/g, "\\'") + '\',-1,this)">−</button>' +
            '<span class="meals-qty-val" id="mqv-' + mealId + '-' + sid + '">0</span>' +
            '<button class="meals-qty-btn" onclick="mealQtyChange(\'' + mealId + '\',\'' + it.name.replace(/'/g, "\\'") + '\',1,this)">+</button>' +
            '</div>';
        });
      });
    } else {
      itemsHtml = '<div style="font-size:.8rem;color:var(--gray);padding:.5rem 0">No menu items added yet.</div>';
    }
    const players = (Hub.cfg && Hub.cfg.players) ? Hub.cfg.players : [];
    const familyOpts = players.map(p => '<option value="' + p.name + '">' + p.name + '</option>').join('');
    body.innerHTML =
      '<h3 style="font-family:var(--fd);font-size:1.35rem;letter-spacing:1px;margin-bottom:.15rem">' + ev.name + '</h3>' +
      '<div style="font-size:.78rem;color:var(--gray);margin-bottom:' + (ev.menuLink ? '.35rem' : '.75rem') + '">' + (ev.restaurant || '') + '</div>' +
      (ev.menuLink ? '<a href="' + ev.menuLink + '" target="_blank" rel="noopener" style="display:inline-block;font-size:.74rem;color:var(--red);margin-bottom:.75rem;text-decoration:none">📋 View Full Menu →</a>' : '') +
      '<div style="margin-bottom:.65rem"><label style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--gray);display:block;margin-bottom:.22rem">Family / Player</label>' +
      '<select class="fi" id="meal-order-family" style="font-size:.84rem"><option value="">— Select —</option>' + familyOpts + '</select></div>' +
      '<div style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--gray);margin-bottom:.15rem">Menu Items</div>' +
      itemsHtml +
      '<div class="meals-running-total" id="meals-running-total">Total: $0.00</div>' +
      '<div style="margin-bottom:.8rem"><label style="font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--gray);display:block;margin-bottom:.22rem">Special Instructions</label>' +
      '<textarea class="fi" id="meal-order-notes" rows="2" placeholder="Allergies, modifications, etc." style="width:100%;resize:vertical;font-size:.82rem"></textarea></div>' +
      '<button class="meals-btn meals-btn-order" id="meal-submit-btn" onclick="submitMealOrder(\'' + mealId + '\')" style="width:100%;justify-content:center;padding:.65rem;font-size:.88rem"><i class="ti ti-check"></i> Submit Order</button>' +
      '<div id="meal-submit-msg" style="display:none;text-align:center;padding:.75rem;font-size:.92rem;color:var(--green);font-weight:700"></div>';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeMealOrderModal() {
    const m = document.getElementById('meals-order-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
  }

  function mealQtyChange(mealId, itemName, delta) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev) return;
    _qtyMap[itemName] = Math.max(0, (_qtyMap[itemName] || 0) + delta);
    const sid = slugify(itemName);
    const valEl = document.getElementById('mqv-' + mealId + '-' + sid);
    if (valEl) valEl.textContent = _qtyMap[itemName];
    let total = 0;
    (ev.menuItems || []).forEach(it => { total += (parseFloat(it.price) || 0) * (_qtyMap[it.name] || 0); });
    const tot = document.getElementById('meals-running-total');
    if (tot) tot.textContent = 'Total: ' + mealFmt(total);
  }

  function submitMealOrder(mealId) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev) return;
    const familySel = document.getElementById('meal-order-family');
    const family = familySel ? familySel.value.trim() : '';
    if (!family) { Hub.toast('Please select your family / player'); return; }
    const lsKey = 'meal_submitted_' + mealId;
    if (localStorage.getItem(lsKey)) { Hub.toast('You already submitted an order for this meal'); return; }
    const items = (ev.menuItems || []).filter(it => (_qtyMap[it.name] || 0) > 0)
      .map(it => ({ name: it.name, qty: _qtyMap[it.name], price: it.price }));
    if (!items.length) { Hub.toast('Please select at least one item'); return; }
    const total = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * it.qty, 0);
    const notes = (document.getElementById('meal-order-notes') || {}).value || '';
    const timestamp = new Date().toISOString().slice(0, 16);
    if (!ev.orders) ev.orders = [];
    ev.orders.push({ family, items, total, specialInstructions: notes.trim(), paid: false, timestamp });
    Hub.save();
    localStorage.setItem(lsKey, '1');
    const btn = document.getElementById('meal-submit-btn');
    const msg = document.getElementById('meal-submit-msg');
    if (btn) btn.style.display = 'none';
    if (msg) { msg.innerHTML = '✅ Order submitted! Total: ' + mealFmt(total); msg.style.display = 'block'; }
    setTimeout(() => { closeMealOrderModal(); renderMeals(); }, 2200);
  }

  // ── Admin Modal ────────────────────────────────────────────────────
  function openMealAdminModal(mealId) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev) return;
    const modal = document.getElementById('meals-admin-modal');
    if (!modal) return;
    _renderAdminBody(ev);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeMealAdminModal() {
    const m = document.getElementById('meals-admin-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
  }

  function _renderAdminBody(ev) {
    const body = document.getElementById('meals-admin-modal-body');
    if (!body) return;
    const orders = ev.orders || [];
    const grandTotal = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const players = (Hub.cfg && Hub.cfg.players) ? Hub.cfg.players : [];
    const familyOpts = '<option value="">— None —</option>' + players.map(p => '<option value="' + p.name + '"' + (ev.paidBy === p.name ? ' selected' : '') + '>' + p.name + '</option>').join('');
    let ordersHtml = '';
    if (!orders.length) {
      ordersHtml = '<div style="text-align:center;padding:1.25rem;color:var(--gray);font-size:.8rem">No orders yet.</div>';
    } else {
      ordersHtml = '<div style="overflow-x:auto"><table class="meals-admin-tbl"><thead><tr><th>Family</th><th>Items</th><th>Total</th><th>Paid</th></tr></thead><tbody>' +
        orders.map((ord, i) => {
          const itemSum = ord.items.map(it => it.qty + '× ' + it.name).join(', ');
          return '<tr>' +
            '<td><strong>' + ord.family + '</strong>' + (ord.specialInstructions ? '<div style="font-size:.64rem;color:var(--gray);margin-top:.15rem">📝 ' + ord.specialInstructions + '</div>' : '') + '</td>' +
            '<td style="font-size:.75rem">' + itemSum + '</td>' +
            '<td style="font-weight:600;white-space:nowrap">' + mealFmt(ord.total) + '</td>' +
            '<td><label style="display:flex;align-items:center;gap:.3rem;cursor:pointer">' +
              '<input type="checkbox"' + (ord.paid ? ' checked' : '') + ' onchange="mealMarkPaid(\'' + ev.id + '\',' + i + ',this.checked)">' +
              '<span style="font-size:.74rem">' + (ord.paid ? '✅ Paid' : 'Unpaid') + '</span></label></td>' +
            '</tr>';
        }).join('') +
        '<tr style="background:#fafafa"><td colspan="2" style="font-weight:700;font-size:.84rem;padding:.6rem .6rem">Grand Total</td>' +
        '<td style="font-weight:700;font-family:var(--fd);font-size:1.1rem;color:var(--red);padding:.6rem .6rem">' + mealFmt(grandTotal) + '</td><td></td></tr>' +
        '</tbody></table></div>';
    }
    body.innerHTML =
      '<h3 style="font-family:var(--fd);font-size:1.35rem;letter-spacing:1px;margin-bottom:.12rem">' + ev.name + '</h3>' +
      '<div style="font-size:.76rem;color:var(--gray);margin-bottom:1rem">' + (ev.restaurant || '') + ' &nbsp;·&nbsp; ' + orders.length + ' order' + (orders.length !== 1 ? 's' : '') + '</div>' +
      ordersHtml +
      '<div style="margin-top:1.1rem;padding-top:.85rem;border-top:1px solid var(--lightgray)">' +
        '<div style="font-size:.62rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gray);margin-bottom:.5rem">Who Paid the Bill?</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.65rem">' +
          '<div><label class="fl">Paid By</label><select class="fi" id="meal-admin-paid-by" style="font-size:.82rem">' + familyOpts + '</select></div>' +
          '<div><label class="fl">Amount Paid ($)</label><input class="fi" id="meal-admin-amount-paid" type="number" step="0.01" placeholder="0.00" value="' + (ev.totalBill || '') + '" style="font-size:.82rem"></div>' +
        '</div>' +
        '<button class="meals-btn meals-btn-order" onclick="mealSaveBillInfo(\'' + ev.id + '\')" style="font-size:.78rem"><i class="ti ti-device-floppy"></i> Save Bill Info</button>' +
      '</div>';
  }

  function mealMarkPaid(mealId, orderIdx, isPaid) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev || !ev.orders[orderIdx]) return;
    ev.orders[orderIdx].paid = isPaid;
    Hub.save();
    renderMealSummary();
    renderMealBalanceTracker();
    _renderAdminBody(ev);
  }

  function mealSaveBillInfo(mealId) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev) return;
    const pb = (document.getElementById('meal-admin-paid-by') || {}).value || '';
    const amt = parseFloat((document.getElementById('meal-admin-amount-paid') || {}).value) || 0;
    ev.paidBy = pb;
    ev.totalBill = amt;
    if (pb) (ev.orders || []).forEach(o => { o.paid = true; });
    Hub.save();
    renderMealSummary();
    renderMealBalanceTracker();
    _renderAdminBody(ev);
    Hub.toast('Bill info saved!');
  }

  function mealToggleStatus(mealId) {
    const ev = getMeals().events.find(e => e.id === mealId);
    if (!ev) return;
    ev.status = ev.status === 'open' ? 'closed' : 'open';
    Hub.save();
    renderMealEventsList();
  }

  function mealDeleteEvent(mealId) {
    if (!confirm('Delete this meal event and all orders?')) return;
    const meals = getMeals();
    meals.events = meals.events.filter(e => e.id !== mealId);
    Hub.save();
    renderMeals();
    Hub.toast('Meal event deleted.');
  }

  // ── Create Meal Event ──────────────────────────────────────────────
  function mealAddItem() {
    const container = document.getElementById('meal-new-items');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'meal-new-item-row';
    row.style.cssText = 'display:grid;grid-template-columns:1fr 80px 120px auto;gap:.35rem;align-items:center;margin-bottom:.35rem';
    row.innerHTML =
      '<input class="fi" placeholder="Item name" style="font-size:.8rem;padding:.32rem .5rem">' +
      '<input class="fi" type="number" step="0.01" min="0" placeholder="$" style="font-size:.8rem;padding:.32rem .45rem">' +
      '<select class="fi" style="font-size:.8rem;padding:.3rem .45rem"><option>Entree</option><option>Side</option><option>Drink</option><option>Dessert</option><option>Kids</option></select>' +
      '<button onclick="this.closest(\'.meal-new-item-row\').remove()" style="background:none;border:1px solid var(--lightgray);border-radius:6px;padding:.28rem .55rem;cursor:pointer;color:var(--gray);font-size:.74rem;white-space:nowrap">Remove</button>';
    container.appendChild(row);
  }

  function mealCreateEvent() {
    const name = (document.getElementById('meal-new-name') || {}).value || '';
    const restaurant = (document.getElementById('meal-new-restaurant') || {}).value || '';
    const deadline = (document.getElementById('meal-new-deadline') || {}).value || '';
    const menuLink = ((document.getElementById('meal-new-menulink') || {}).value || '').trim();
    if (!name.trim() || !restaurant.trim()) { Hub.toast('Meal name and restaurant are required'); return; }
    const rows = document.querySelectorAll('.meal-new-item-row');
    const menuItems = [];
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input,select');
      const n = (inputs[0] ? inputs[0].value.trim() : '');
      const p = parseFloat(inputs[1] ? inputs[1].value : '') || 0;
      const cat = inputs[2] ? inputs[2].value : 'Entree';
      if (n) menuItems.push({ name: n, price: p, category: cat });
    });
    const id = 'meal_' + Date.now();
    getMeals().events.push({ id, name: name.trim(), restaurant: restaurant.trim(), menuLink, deadline, status: 'open', menuItems, orders: [], paidBy: '', totalBill: 0 });
    Hub.save();
    ['meal-new-name', 'meal-new-restaurant', 'meal-new-deadline', 'meal-new-menulink'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const items = document.getElementById('meal-new-items');
    if (items) { items.innerHTML = ''; mealAddItem(); }
    renderMeals();
    Hub.toast('Meal event created!');
  }

})();
