/* ===== GALLERY — self-contained module =====
 * Reads window._GALLERY_TEAM for team slug (set by js/config-<team>.js).
 * Replaces gallery-loader.js + gallery-reactions.js + gallery-infinite-scroll.js.
 */
(() => {
  'use strict';

  const WORKER = 'https://mindset-gallery.wenga-eric.workers.dev';
  const RXN = { heart: '❤️', thumbsup: '👍', laughing: '😂' };
  const RXN_ORDER = ['heart', 'thumbsup', 'laughing'];
  const BATCH = 16;

  let TEAM;
  let items = [];
  let view = [];
  let filter = 'all';
  let shown = 0;
  let rxnMap = {};
  let rxnSubs = {};
  let authed = false;
  let pw = '';
  let pendingFiles = null;
  let lbIndex = 0;
  let uploading = false;
  let lbOpen = false;
  let device;
  let lastVisit = 0;
  let _pickKey = null;
  let _tt = null;
  let canShareFiles = false;

  const $id = (id) => document.getElementById(id);

  /* ---------- device ID ---------- */
  function getDevice() {
    let d = localStorage.getItem('gallery_device');
    if (!d) {
      d = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem('gallery_device', d); } catch (e) { /* ignore */ }
    }
    return d;
  }

  /* ---------- persistent auth cookie ---------- */
  // Browsers cap persistent cookies at ~400 days; we refresh the expiry on each
  // visit (see boot) so the upload-enabled state effectively never lapses for
  // anyone who keeps using the page.
  const COOKIE_MAX_AGE = 34560000; // ~400 days, in seconds
  function setCookie(name, value) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  }
  function getCookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function delCookie(name) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }

  /* ---------- data ---------- */
  function fetchList(bust) {
    $id('m-error').style.display = 'none';
    $id('m-empty').style.display = 'none';
    $id('m-skeleton').style.display = items.length ? 'none' : 'grid';
    let url = `${WORKER}/gallery-images?team=${TEAM}`;
    if (bust) url += `&_t=${Date.now()}`;
    fetch(url)
      .then((r) => { if (!r.ok) throw 0; return r.json(); })
      .then((d) => { items = (d.images || []).slice(); afterLoad(); })
      .catch(() => {
        $id('m-skeleton').style.display = 'none';
        if (!items.length) $id('m-error').style.display = 'block';
      });
  }

  function afterLoad() {
    $id('m-skeleton').style.display = 'none';
    renderStats();
    render();
    fetchReactions(items.map((i) => i.key));
  }

  function counts() {
    let img = 0;
    let vid = 0;
    items.forEach((i) => { if (i.type === 'video') vid++; else img++; });
    return { all: items.length, image: img, video: vid };
  }

  function renderStats() {
    const c = counts();
    document.querySelectorAll('#m-filters .mfc').forEach((s) => {
      s.textContent = c[s.dataset.c] || 0;
    });
  }

  function isNew(it) {
    if (!lastVisit) return false;
    const t = Date.parse(it.uploaded);
    return !!(t && t > lastVisit);
  }

  /* ---------- reactions ---------- */
  function fetchReactions(keys) {
    if (!keys || !keys.length) return;
    const url = `${WORKER}/reactions?team=${TEAM}` +
      `&deviceId=${encodeURIComponent(device)}` +
      `&keys=${encodeURIComponent(keys.join(','))}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.reactions) return;
        Object.keys(d.reactions).forEach((k) => { rxnMap[k] = d.reactions[k]; emitRxn(k); });
      })
      .catch(() => {});
  }

  function rxnFor(key) {
    return rxnMap[key] || { counts: { heart: 0, thumbsup: 0, laughing: 0 }, mine: null };
  }

  function onRxn(key, fn) {
    if (!rxnSubs[key]) rxnSubs[key] = [];
    rxnSubs[key].push(fn);
  }

  function emitRxn(key) {
    (rxnSubs[key] || []).forEach((fn) => { try { fn(rxnFor(key)); } catch (e) { /* ignore */ } });
    if (lbOpen && view[lbIndex] && view[lbIndex].key === key) renderLBRxns();
  }

  function react(key, type) {
    const cur = rxnFor(key);
    const removing = cur.mine === type;
    const next = { counts: { ...cur.counts }, mine: removing ? null : type };
    if (cur.mine) next.counts[cur.mine] = Math.max(0, (next.counts[cur.mine] || 0) - 1);
    if (!removing) next.counts[type] = (next.counts[type] || 0) + 1;
    rxnMap[key] = next;
    emitRxn(key);
    fetch(`${WORKER}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: TEAM, imageKey: key, deviceId: device, reaction: removing ? null : type }),
    }).then((r) => { if (!r.ok) throw 0; })
      .catch(() => { rxnMap[key] = cur; emitRxn(key); mtoast('Could not save reaction'); });
  }

  function buildStrip(item) {
    const el = document.createElement('div');
    el.className = 'mrxns';
    const paint = (data) => {
      el.innerHTML = '';
      RXN_ORDER.forEach((type) => {
        const n = data.counts[type] || 0;
        if (n <= 0) return;
        const b = document.createElement('button');
        b.className = 'mrxn' + (data.mine === type ? ' mrxn--mine' : '');
        b.innerHTML = `${RXN[type]}<span class="mrxn-c">${n}</span>`;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (rxnFor(item.key).mine === type) react(item.key, type); else openPicker(el, item.key);
        });
        el.appendChild(b);
      });
      const add = document.createElement('button');
      add.className = 'mrxn mrxn-add';
      add.innerHTML = data.mine ? RXN[data.mine] : '<i class="ti ti-mood-smile"></i>';
      if (data.mine) add.classList.add('mrxn--mine');
      add.addEventListener('click', (e) => { e.stopPropagation(); openPicker(el, item.key); });
      if (!data.mine) {
        el.appendChild(add);
      } else if (!RXN_ORDER.some((t) => (data.counts[t] || 0) > 0)) {
        el.appendChild(add);
      }
    };
    paint(rxnFor(item.key));
    onRxn(item.key, paint);
    return el;
  }

  function renderLBRxns() {
    const it = view[lbIndex];
    if (!it) return;
    const data = rxnFor(it.key);
    document.querySelectorAll('#m-lb-rxns .mlb-rxn').forEach((b) => {
      const t = b.dataset.r;
      b.classList.toggle('mlb-rxn--mine', data.mine === t);
      const c = b.querySelector(`[data-rc="${t}"]`);
      if (c) c.textContent = data.counts[t] || 0;
    });
  }

  /* ---------- picker ---------- */
  function bindPicker() {
    const pk = $id('m-picker');
    pk.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (_pickKey) { react(_pickKey, b.dataset.r); popEl(b); }
        closePicker();
      });
    });
    document.addEventListener('pointerdown', (e) => {
      if ($id('m-picker').classList.contains('on') && !pk.contains(e.target)) closePicker();
    }, true);
    window.addEventListener('scroll', closePicker, { passive: true });
  }

  function openPicker(anchorEl, key) {
    const pk = $id('m-picker');
    _pickKey = key;
    const data = rxnFor(key);
    const mine = data.mine;
    pk.classList.toggle('has-mine', !!mine);
    pk.querySelectorAll('button').forEach((b) => {
      const t = b.dataset.r;
      const n = data.counts[t] || 0;
      b.classList.toggle('mine', t === mine);
      b.classList.toggle('has-others', n > 0 && t !== mine);
      const badge = b.querySelector('.mpk-c');
      if (badge) { badge.textContent = n; badge.classList.toggle('on', n > 0); }
    });
    pk.style.cssText = 'display:flex;visibility:hidden;left:-999px;top:-999px';
    const pw2 = pk.offsetWidth;
    const ph = pk.offsetHeight;
    pk.style.cssText = '';
    const r = anchorEl.getBoundingClientRect();
    let left = r.left + r.width / 2 - pw2 / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - pw2 - 10));
    let top = r.top - ph - 8;
    if (top < 8) top = Math.min(window.innerHeight - ph - 8, r.bottom + 8);
    pk.style.left = `${left}px`;
    pk.style.top = `${top}px`;
    pk.classList.add('on');
  }

  function closePicker() { $id('m-picker').classList.remove('on'); _pickKey = null; }

  function popEl(el) { el.classList.remove('mpoppop'); void el.offsetWidth; el.classList.add('mpoppop'); }

  /* ---------- render ---------- */
  function render() {
    view = filter === 'all' ? items.slice() : items.filter((i) => (filter === 'video' ? i.type === 'video' : i.type !== 'video'));
    const grid = $id('m-grid');
    grid.innerHTML = '';
    shown = 0;
    rxnSubs = {};
    if (!view.length) {
      grid.style.display = 'none';
      $id('m-spin').style.display = 'none';
      $id('m-end').style.display = 'none';
      $id('m-empty').style.display = 'block';
      const h = $id('m-empty-h');
      if (h) h.textContent = items.length
        ? `No ${filter === 'video' ? 'videos' : 'photos'} yet`
        : 'No media here yet';
      return;
    }
    $id('m-empty').style.display = 'none';
    grid.style.display = 'grid';
    appendBatch();
  }

  function appendBatch() {
    const grid = $id('m-grid');
    if (shown >= view.length) return;
    const end = Math.min(shown + BATCH, view.length);
    for (let i = shown; i < end; i++) grid.appendChild(makeTile(view[i], i));
    shown = end;
    requestAnimationFrame(relayout); // set initial spans from default _ar before images load
    const done = shown >= view.length;
    $id('m-spin').style.display = done ? 'none' : 'flex';
    $id('m-end').style.display = done && view.length > BATCH ? 'block' : 'none';
    if (!done) requestAnimationFrame(maybeFill);
  }

  function maybeFill() {
    if (shown >= view.length) return;
    const s = $id('m-sentinel');
    if (!s) return;
    if (s.getBoundingClientRect().top < (window.innerHeight || 0) + 600) appendBatch();
  }

  function makeTile(item, index) {
    const t = document.createElement('div');
    t.className = 'mtile';
    t.style.animationDelay = `${Math.min(index % BATCH, 12) * 0.035}s`;
    t._ar = 1.2; // default aspect ratio so tile has height before image loads

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = item.thumbnailUrl || item.url;
    img.addEventListener('load', () => {
      t._ar = (img.naturalHeight / img.naturalWidth) || 1.2;
      setSpan(t);
    });
    img.addEventListener('error', () => { t._ar = 1; setSpan(t); });
    t.appendChild(img);
    t.insertAdjacentHTML('beforeend', '<div class="mtile-grad"></div>');

    if (item.type === 'video') {
      t.insertAdjacentHTML('beforeend',
        '<span class="mbadge"><i class="ti ti-video"></i> Video</span>' +
        '<div class="mplay"><span><i class="ti ti-player-play-filled"></i></span></div>');
    }
    if (isNew(item)) {
      t.insertAdjacentHTML('beforeend',
        '<span class="mbadge new"><i class="ti ti-sparkles"></i> New</span>');
    }

    const act = document.createElement('div');
    act.className = 'mtile-act';
    act.innerHTML = '<button data-act="open" title="View"><i class="ti ti-arrows-maximize"></i></button>' +
      (item.type !== 'video' ? '<button data-act="save" title="Save"><i class="ti ti-download"></i></button>' : '');
    act.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (b.dataset.act === 'save') saveItem(item); else openLB(index);
      });
    });
    t.appendChild(act);
    t.appendChild(buildStrip(item));

    t.addEventListener('click', (e) => {
      if (e.target.closest('.mrxns') || e.target.closest('.mtile-act')) return;
      openLB(index);
    });
    addLongPress(t, () => saveItem(item));
    return t;
  }

  function setSpan(t) {
    const grid = $id('m-grid');
    if (!grid) return;
    const w = t.clientWidth;
    if (!w) return;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 12;
    const row = 6;
    const h = w * (t._ar || 1.2);
    t.style.gridRowEnd = `span ${Math.max(1, Math.ceil((h + gap) / (row + gap)))}`;
  }

  function relayout() {
    const grid = $id('m-grid');
    if (!grid) return;
    [...grid.children].forEach((t) => setSpan(t));
  }

  function addLongPress(el, cb) {
    let timer = null;
    let sx;
    let sy;
    el.addEventListener('touchstart', (e) => {
      const tc = e.touches[0];
      sx = tc.clientX;
      sy = tc.clientY;
      timer = setTimeout(() => {
        timer = null;
        el.classList.add('pressing');
        setTimeout(() => el.classList.remove('pressing'), 220);
        cb();
      }, 550);
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!timer) return;
      const tc = e.touches[0];
      if (Math.abs(tc.clientX - sx) > 8 || Math.abs(tc.clientY - sy) > 8) { clearTimeout(timer); timer = null; }
    }, { passive: true });
    const clr = () => { if (timer) { clearTimeout(timer); timer = null; } };
    el.addEventListener('touchend', clr, { passive: true });
    el.addEventListener('touchcancel', clr, { passive: true });
  }

  /* ---------- lightbox ---------- */
  function openLB(i) {
    lbIndex = i;
    lbOpen = true;
    const lb = $id('m-lb');
    lb.classList.add('on');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showLB();
  }

  function closeLB() {
    lbOpen = false;
    const lb = $id('m-lb');
    lb.classList.remove('on');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    $id('m-lb-media').innerHTML = '';
  }

  function nav(d) {
    if (!view.length) return;
    lbIndex = (lbIndex + d + view.length) % view.length;
    showLB();
  }

  function showLB() {
    const it = view[lbIndex];
    if (!it) return;
    const media = $id('m-lb-media');
    media.innerHTML = '';
    const spin = document.createElement('div');
    spin.className = 'mlb-spin';
    $id('m-lb-stage').appendChild(spin);
    const rm = () => { if (spin.parentNode) spin.parentNode.removeChild(spin); };

    if (it.type === 'video') {
      const v = document.createElement('video');
      v.src = it.url;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.poster = it.thumbnailUrl || '';
      v.addEventListener('loadeddata', rm);
      v.addEventListener('error', rm);
      media.appendChild(v);
      rm();
    } else {
      const im = new Image();
      im.onload = rm;
      im.onerror = rm;
      im.src = it.url;
      im.alt = '';
      media.appendChild(im);
      const bh = document.createElement('div');
      bh.className = 'mlb-bigheart';
      bh.textContent = '❤️';
      bh.id = 'm-bigheart';
      media.appendChild(bh);
      [1, -1].forEach((d2) => {
        const n = view[(lbIndex + d2 + view.length) % view.length];
        if (n && n.type !== 'video') { const p = new Image(); p.src = n.url; }
      });
    }
    $id('m-lb-count').textContent = `${lbIndex + 1} / ${view.length}`;
    $id('m-lb-date').textContent = fmtDate(it.uploaded);
    const saveL = $id('m-lb-save-l');
    const saveBtn = $id('m-lb-save');
    if (canShareFiles) {
      saveL.textContent = 'Save';
      saveBtn.querySelector('i').className = 'ti ti-device-mobile-share';
    } else {
      saveL.textContent = 'Download';
      saveBtn.querySelector('i').className = 'ti ti-download';
    }
    renderLBRxns();
  }

  function bindLBGestures() {
    const stage = $id('m-lb-stage');
    let sx = 0;
    let sy = 0;
    let t0 = 0;
    let active = false;
    let lastTap = 0;
    stage.addEventListener('touchstart', (e) => {
      if (e.target.closest('video')) return;
      const tc = e.changedTouches[0];
      sx = tc.clientX;
      sy = tc.clientY;
      t0 = Date.now();
      active = true;
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (!active) return;
      active = false;
      const tc = e.changedTouches[0];
      const dx = tc.clientX - sx;
      const dy = tc.clientY - sy;
      const dt = Date.now() - t0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { nav(dx < 0 ? 1 : -1); }
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { closeLB(); }
      else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) {
        const now = Date.now();
        if (now - lastTap < 300) { lastTap = 0; lbHeart(); } else lastTap = now;
      }
    }, { passive: true });
    $id('m-lb-media').addEventListener('dblclick', (e) => {
      if (e.target.tagName !== 'VIDEO') lbHeart();
    });
  }

  function lbHeart() {
    const it = view[lbIndex];
    if (!it || it.type === 'video') return;
    react(it.key, 'heart');
    const bh = $id('m-bigheart');
    if (bh) { bh.classList.remove('go'); void bh.offsetWidth; bh.classList.add('go'); }
  }

  /* ---------- upload ---------- */
  function uploadOrPrompt(files) {
    if (!authed) {
      pendingFiles = files || null;
      $id('m-pw').classList.add('on');
      setTimeout(() => $id('m-pw-in').focus(), 60);
      return;
    }
    if (files) doUpload(files); else $id('m-file').click();
  }

  function checkPw() {
    const inp = $id('m-pw-in');
    const errEl = $id('m-pw-err');
    const go = $id('m-pw-go');
    const cand = inp.value;
    if (!cand) { errEl.textContent = 'Please enter the password.'; return; }
    go.disabled = true;
    errEl.textContent = '';
    fetch(`${WORKER}/validate-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cand }),
    }).then((r) => r.json())
      .then((d) => {
        go.disabled = false;
        if (d.valid) {
          authed = true;
          pw = cand;
          setCookie('gallery_authed', '1');
          setCookie('gallery_pw', cand);
          $id('m-pw').classList.remove('on');
          inp.value = '';
          const f = pendingFiles;
          pendingFiles = null;
          if (f) doUpload(f); else $id('m-file').click();
        } else { errEl.textContent = 'Incorrect password. Try again.'; }
      })
      .catch(() => { go.disabled = false; errEl.textContent = 'Network error — try again.'; });
  }

  function setProg(p) { $id('m-prog').style.width = `${Math.round(p * 100)}%`; }

  async function doUpload(fileList) {
    if (uploading) return;
    const { valid, invalid } = filterFiles(fileList);
    if (invalid.length) mtoast(`${invalid.length} file${invalid.length > 1 ? 's' : ''} skipped (unsupported)`);
    if (!valid.length) return;
    if (valid.length > 10) { mtoast('Max 10 files at a time — please split into batches.'); return; }
    uploading = true;
    setProg(0.02);
    const uploaded = [];
    try {
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        const isVid = file.type.startsWith('video/');
        mtoast(`Uploading${valid.length > 1 ? ` (${i + 1}/${valid.length})` : ''}…`);
        const thumb = await (isVid ? makeVideoThumb(file) : makeThumb(file));
        const r = await fetch(`${WORKER}/gallery-upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type, team: TEAM, password: pw, type: isVid ? 'video' : 'image' }),
        });
        if (r.status === 401) {
          authed = false;
          pw = '';
          delCookie('gallery_authed');
          delCookie('gallery_pw');
          sessionStorage.removeItem('gallery_authed');
          sessionStorage.removeItem('gallery_pw');
          throw 'Session expired — tap Add again.';
        }
        if (!r.ok) { const e = await r.json(); throw e.error || 'Upload failed'; }
        const d = await r.json();
        await xhrPut(d.imageUploadUrl, file, (p) => setProg((i + p * 0.6) / valid.length));
        await xhrPut(d.thumbUploadUrl, thumb, (p) => setProg((i + 0.6 + p * 0.4) / valid.length));
        uploaded.push({
          key: (isVid ? 'videos/' : 'images/') + d.key,
          url: d.imageUrl,
          thumbnailUrl: d.thumbUrl,
          type: isVid ? 'video' : 'image',
          uploaded: new Date().toISOString(),
          size: file.size,
        });
      }
      setProg(1);
      uploaded.reverse().forEach((it) => items.unshift(it));
      renderStats();
      render();
      fetchReactions(uploaded.map((u) => u.key));
      mtoast(`${valid.length} added — newest first ✓`);
      setTimeout(() => { setProg(0); $id('m-prog').style.width = '0'; }, 700);
      uploading = false;
    } catch (err) {
      mtoast(typeof err === 'string' ? err : 'Upload error');
      setProg(0);
      $id('m-prog').style.width = '0';
      uploading = false;
    }
  }

  function xhrPut(url, file, onProg) {
    return new Promise((res2, rej) => {
      const x = new XMLHttpRequest();
      x.open('PUT', url);
      x.setRequestHeader('Content-Type', file.type);
      x.upload.onprogress = (e) => { if (e.lengthComputable) onProg(e.loaded / e.total); };
      x.onload = () => { (x.status >= 200 && x.status < 300) ? res2() : rej(`Storage upload failed (${x.status})`); };
      x.onerror = () => rej('Network error during upload');
      x.send(file);
    });
  }

  function filterFiles(list) {
    const valid = [];
    const invalid = [];
    const okImg = /^image\/(jpeg|png|gif|webp|avif)$/;
    const okVid = /^video\/(mp4|quicktime|webm)$/;
    [...list].forEach((f) => {
      const isVid = f.type.indexOf('video/') === 0;
      if (okImg.test(f.type) || okVid.test(f.type) || /\.mov$/i.test(f.name)) {
        if (isVid && f.size > 200 * 1024 * 1024) invalid.push(f); else valid.push(f);
      } else invalid.push(f);
    });
    return { valid, invalid };
  }

  function makeThumb(file) {
    return new Promise((res2, rej) => {
      const url = URL.createObjectURL(file);
      const img2 = new Image();
      img2.onload = () => {
        const max = 1100;
        let w = img2.naturalWidth;
        let h = img2.naturalHeight;
        const s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s);
        h = Math.round(h * s);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img2, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob((b) => { b ? res2(b) : rej('thumb failed'); }, 'image/jpeg', 0.82);
      };
      img2.onerror = () => { URL.revokeObjectURL(url); rej('image read failed'); };
      img2.src = url;
    });
  }

  function makeVideoThumb(file) {
    return new Promise((res2, rej) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      let done = false;
      const fail = () => { if (done) return; done = true; URL.revokeObjectURL(url); rej('video read failed'); };
      v.onloadeddata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (e) { fail(); } };
      v.onseeked = () => {
        if (done) return;
        done = true;
        const max = 1100;
        let w = v.videoWidth || 640;
        let h = v.videoHeight || 360;
        const s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s);
        h = Math.round(h * s);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(v, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob((b) => { b ? res2(b) : rej('vthumb failed'); }, 'image/jpeg', 0.82);
      };
      v.onerror = fail;
      setTimeout(() => { if (!done) fail(); }, 15000);
      v.src = url;
    });
  }

  /* ---------- drag & drop ---------- */
  function bindDrag() {
    const ov = $id('m-drag');
    let depth = 0;
    const show = () => ov.classList.add('on');
    const hide = () => ov.classList.remove('on');
    window.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer || [...(e.dataTransfer.types || [])].indexOf('Files') < 0) return;
      e.preventDefault();
      depth++;
      show();
    });
    window.addEventListener('dragover', (e) => { if (ov.classList.contains('on')) e.preventDefault(); });
    window.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; hide(); } });
    window.addEventListener('drop', (e) => {
      if (ov.classList.contains('on')) {
        e.preventDefault();
        depth = 0;
        hide();
        if (e.dataTransfer.files && e.dataTransfer.files.length) uploadOrPrompt(e.dataTransfer.files);
      }
    });
  }

  /* ---------- save / share ---------- */
  function saveItem(item) {
    const fname = (item.key || 'media').split('/').pop().split('?')[0] ||
      (item.type === 'video' ? 'video.mp4' : 'photo.jpg');
    mtoast(canShareFiles ? 'Preparing…' : 'Downloading…');
    fetch(item.url, { mode: 'cors' })
      .then((r) => { if (!r.ok) throw 0; return r.blob(); })
      .then((blob) => {
        if (canShareFiles) {
          const f2 = new File([blob], fname, { type: blob.type || 'application/octet-stream' });
          if (navigator.canShare && navigator.canShare({ files: [f2] })) {
            return navigator.share({ files: [f2] })
              .then(() => mtoast('Shared ✓'))
              .catch((err) => { if (err && err.name === 'AbortError') return; blobDownload(blob, fname); });
          }
        }
        blobDownload(blob, fname);
        mtoast('Saved ✓');
      })
      .catch(() => {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = fname;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  }

  function blobDownload(blob, fname) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  /* ---------- utils ---------- */
  function fmtDate(iso) {
    const t = Date.parse(iso);
    if (!t) return '';
    try { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; }
  }

  function mtoast(msg) {
    const el = $id('m-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(_tt);
    _tt = setTimeout(() => el.classList.remove('on'), 2400);
  }

  /* ---------- boot ---------- */
  function boot() {
    TEAM = window._GALLERY_TEAM || '14red';
    // Persistent cookie first; fall back to a legacy sessionStorage login so an
    // already-authed session isn't dropped after this change ships.
    pw = getCookie('gallery_pw') || sessionStorage.getItem('gallery_pw') || '';
    authed = getCookie('gallery_authed') === '1' || (sessionStorage.getItem('gallery_authed') === '1' && !!pw);
    if (authed && pw) { setCookie('gallery_authed', '1'); setCookie('gallery_pw', pw); } // roll expiry forward
    device = getDevice();
    const _visitKey = `gallery_last_${TEAM}`;
    lastVisit = parseInt(localStorage.getItem(_visitKey)) || 0;
    try { localStorage.setItem(_visitKey, Date.now()); } catch (e) { /* ignore */ }
    canShareFiles = !!(navigator.canShare && (() => {
      try { return navigator.canShare({ files: [new File([new Blob(['x'])], 'x.jpg', { type: 'image/jpeg' })] }); } catch (e) { return false; }
    })());

    document.querySelectorAll('#m-filters .mfilter').forEach((b) => {
      b.addEventListener('click', () => {
        if (filter === b.dataset.f) return;
        filter = b.dataset.f;
        document.querySelectorAll('#m-filters .mfilter').forEach((x) => x.classList.toggle('on', x === b));
        render();
      });
    });

    const addClick = () => uploadOrPrompt(null);
    $id('m-add')?.addEventListener('click', addClick);
    $id('m-fab')?.addEventListener('click', addClick);
    $id('m-empty-add')?.addEventListener('click', addClick);
    $id('m-retry')?.addEventListener('click', () => fetchList());
    $id('m-refresh')?.addEventListener('click', () => { mtoast('Refreshing…'); fetchList(true); });
    $id('m-file')?.addEventListener('change', (e) => { doUpload(e.target.files); e.target.value = ''; });

    $id('m-pw-go')?.addEventListener('click', checkPw);
    $id('m-pw-in')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPw(); });
    $id('m-pw-cancel')?.addEventListener('click', () => { $id('m-pw').classList.remove('on'); pendingFiles = null; });

    $id('m-lb-close')?.addEventListener('click', closeLB);
    $id('m-lb-prev')?.addEventListener('click', () => nav(-1));
    $id('m-lb-next')?.addEventListener('click', () => nav(1));
    $id('m-lb-save')?.addEventListener('click', () => { const it = view[lbIndex]; if (it) saveItem(it); });

    document.querySelectorAll('#m-lb-rxns .mlb-rxn').forEach((b) => {
      b.addEventListener('click', () => {
        const it = view[lbIndex];
        if (it) { react(it.key, b.dataset.r); popEl(b); }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (!$id('m-lb').classList.contains('on')) return;
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    });

    bindLBGestures();
    bindPicker();

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) appendBatch();
      }, { rootMargin: '600px' });
      io.observe($id('m-sentinel'));
    }
    let st;
    window.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(maybeFill, 120); }, { passive: true });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 140); }, { passive: true });

    bindDrag();
    fetchList();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
