/* ===== GALLERY — self-contained module =====
 * Reads window._GALLERY_TEAM for team slug (set inline on each hub page).
 * Replaces gallery-loader.js + gallery-reactions.js + gallery-infinite-scroll.js.
 */
(function () {
  'use strict';

  var WORKER = 'https://mindset-gallery.wenga-eric.workers.dev';
  var RXN = { heart: '❤️', thumbsup: '👍', laughing: '😂' };
  var RXN_ORDER = ['heart', 'thumbsup', 'laughing'];

  var TEAM, items = [], view = [], filter = 'all', BATCH = 16, shown = 0;
  var rxnMap = {}, rxnSubs = {};
  var authed = false, pw = '', pendingFiles = null, lbIndex = 0, uploading = false, lbOpen = false;
  var device, lastVisit = 0, _pickKey = null, _tt = null;
  var canShareFiles = false;

  function $id(id) { return document.getElementById(id); }

  /* ---------- device ID ---------- */
  function getDevice() {
    var d = localStorage.getItem('gallery_device');
    if (!d) {
      d = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem('gallery_device', d); } catch (e) {}
    }
    return d;
  }

  /* ---------- data ---------- */
  function fetchList(bust) {
    $id('m-error').style.display = 'none';
    $id('m-empty').style.display = 'none';
    $id('m-skeleton').style.display = items.length ? 'none' : 'grid';
    var url = WORKER + '/gallery-images?team=' + TEAM;
    if (bust) url += '&_t=' + Date.now();
    fetch(url)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { items = (d.images || []).slice(); afterLoad(); })
      .catch(function () {
        $id('m-skeleton').style.display = 'none';
        if (!items.length) $id('m-error').style.display = 'block';
      });
  }

  function afterLoad() {
    $id('m-skeleton').style.display = 'none';
    renderStats();
    render();
    fetchReactions(items.map(function (i) { return i.key; }));
  }

  function counts() {
    var img = 0, vid = 0;
    items.forEach(function (i) { if (i.type === 'video') vid++; else img++; });
    return { all: items.length, image: img, video: vid };
  }

  function renderStats() {
    var c = counts();
    document.querySelectorAll('#m-filters .mfc').forEach(function (s) {
      s.textContent = c[s.dataset.c] || 0;
    });
  }

  function isNew(it) {
    if (!lastVisit) return false;
    var t = Date.parse(it.uploaded);
    return !!(t && t > lastVisit);
  }

  /* ---------- reactions ---------- */
  function fetchReactions(keys) {
    if (!keys || !keys.length) return;
    var url = WORKER + '/reactions?team=' + TEAM +
      '&deviceId=' + encodeURIComponent(device) +
      '&keys=' + encodeURIComponent(keys.join(','));
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.reactions) return;
        Object.keys(d.reactions).forEach(function (k) { rxnMap[k] = d.reactions[k]; emitRxn(k); });
      })
      .catch(function () {});
  }

  function rxnFor(key) {
    return rxnMap[key] || { counts: { heart: 0, thumbsup: 0, laughing: 0 }, mine: null };
  }

  function onRxn(key, fn) {
    if (!rxnSubs[key]) rxnSubs[key] = [];
    rxnSubs[key].push(fn);
  }

  function emitRxn(key) {
    (rxnSubs[key] || []).forEach(function (fn) { try { fn(rxnFor(key)); } catch (e) {} });
    if (lbOpen && view[lbIndex] && view[lbIndex].key === key) renderLBRxns();
  }

  function react(key, type) {
    var cur = rxnFor(key);
    if (cur.mine === type) return;
    var next = { counts: Object.assign({}, cur.counts), mine: type };
    if (cur.mine) next.counts[cur.mine] = Math.max(0, (next.counts[cur.mine] || 0) - 1);
    next.counts[type] = (next.counts[type] || 0) + 1;
    rxnMap[key] = next; emitRxn(key);
    fetch(WORKER + '/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: TEAM, imageKey: key, deviceId: device, reaction: type })
    }).then(function (r) { if (!r.ok) throw 0; })
      .catch(function () { rxnMap[key] = cur; emitRxn(key); mtoast('Could not save reaction'); });
  }

  function buildStrip(item) {
    var el = document.createElement('div');
    el.className = 'mrxns';
    function paint(data) {
      el.innerHTML = '';
      RXN_ORDER.forEach(function (type) {
        var n = data.counts[type] || 0;
        if (n <= 0) return;
        var b = document.createElement('button');
        b.className = 'mrxn' + (data.mine === type ? ' mrxn--mine' : '');
        b.innerHTML = RXN[type] + '<span class="mrxn-c">' + n + '</span>';
        b.addEventListener('click', function (e) { e.stopPropagation(); openPicker(el, item.key); });
        el.appendChild(b);
      });
      var add = document.createElement('button');
      add.className = 'mrxn mrxn-add';
      add.innerHTML = data.mine ? RXN[data.mine] : '<i class="ti ti-mood-smile"></i>';
      if (data.mine) add.classList.add('mrxn--mine');
      add.addEventListener('click', function (e) { e.stopPropagation(); openPicker(el, item.key); });
      if (!data.mine) {
        el.appendChild(add);
      } else if (!RXN_ORDER.some(function (t) { return (data.counts[t] || 0) > 0; })) {
        el.appendChild(add);
      }
    }
    paint(rxnFor(item.key));
    onRxn(item.key, paint);
    return el;
  }

  function renderLBRxns() {
    var it = view[lbIndex]; if (!it) return;
    var data = rxnFor(it.key);
    document.querySelectorAll('#m-lb-rxns .mlb-rxn').forEach(function (b) {
      var t = b.dataset.r;
      b.classList.toggle('mlb-rxn--mine', data.mine === t);
      var c = b.querySelector('[data-rc="' + t + '"]');
      if (c) c.textContent = data.counts[t] || 0;
    });
  }

  /* ---------- picker ---------- */
  function bindPicker() {
    var pk = $id('m-picker');
    pk.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (_pickKey) { react(_pickKey, b.dataset.r); popEl(b); }
        closePicker();
      });
    });
    document.addEventListener('pointerdown', function (e) {
      if ($id('m-picker').classList.contains('on') && !pk.contains(e.target)) closePicker();
    }, true);
    window.addEventListener('scroll', closePicker, { passive: true });
  }

  function openPicker(anchorEl, key) {
    var pk = $id('m-picker');
    _pickKey = key;
    var data = rxnFor(key), mine = data.mine;
    pk.classList.toggle('has-mine', !!mine);
    pk.querySelectorAll('button').forEach(function (b) {
      var t = b.dataset.r, n = data.counts[t] || 0;
      b.classList.toggle('mine', t === mine);
      b.classList.toggle('has-others', n > 0 && t !== mine);
      var badge = b.querySelector('.mpk-c');
      if (badge) { badge.textContent = n; badge.classList.toggle('on', n > 0); }
    });
    pk.style.cssText = 'display:flex;visibility:hidden;left:-999px;top:-999px';
    var pw2 = pk.offsetWidth, ph = pk.offsetHeight;
    pk.style.cssText = '';
    var r = anchorEl.getBoundingClientRect();
    var left = r.left + r.width / 2 - pw2 / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - pw2 - 10));
    var top = r.top - ph - 8;
    if (top < 8) top = Math.min(window.innerHeight - ph - 8, r.bottom + 8);
    pk.style.left = left + 'px';
    pk.style.top = top + 'px';
    pk.classList.add('on');
  }

  function closePicker() { $id('m-picker').classList.remove('on'); _pickKey = null; }

  function popEl(el) { el.classList.remove('mpoppop'); void el.offsetWidth; el.classList.add('mpoppop'); }

  /* ---------- render ---------- */
  function render() {
    view = filter === 'all' ? items.slice() : items.filter(function (i) {
      return filter === 'video' ? i.type === 'video' : i.type !== 'video';
    });
    var grid = $id('m-grid');
    grid.innerHTML = ''; shown = 0; rxnSubs = {};
    if (!view.length) {
      grid.style.display = 'none';
      $id('m-spin').style.display = 'none';
      $id('m-end').style.display = 'none';
      $id('m-empty').style.display = 'block';
      var h = $id('m-empty-h');
      if (h) h.textContent = items.length
        ? ('No ' + (filter === 'video' ? 'videos' : 'photos') + ' yet')
        : 'No media here yet';
      return;
    }
    $id('m-empty').style.display = 'none';
    grid.style.display = 'grid';
    appendBatch();
  }

  function appendBatch() {
    var grid = $id('m-grid');
    if (shown >= view.length) return;
    var end = Math.min(shown + BATCH, view.length);
    for (var i = shown; i < end; i++) grid.appendChild(makeTile(view[i], i));
    shown = end;
    requestAnimationFrame(relayout); // set initial spans from default _ar before images load
    var done = shown >= view.length;
    $id('m-spin').style.display = done ? 'none' : 'flex';
    $id('m-end').style.display = done && view.length > BATCH ? 'block' : 'none';
    if (!done) requestAnimationFrame(maybeFill);
  }

  function maybeFill() {
    if (shown >= view.length) return;
    var s = $id('m-sentinel'); if (!s) return;
    if (s.getBoundingClientRect().top < (window.innerHeight || 0) + 600) appendBatch();
  }

  function makeTile(item, index) {
    var t = document.createElement('div');
    t.className = 'mtile';
    t.style.animationDelay = (Math.min(index % BATCH, 12) * 0.035) + 's';
    t._ar = 1.2; // default aspect ratio so tile has height before image loads

    var img = document.createElement('img');
    img.loading = 'lazy'; img.alt = '';
    img.src = item.thumbnailUrl || item.url;
    img.addEventListener('load', function () {
      t._ar = (img.naturalHeight / img.naturalWidth) || 1.2;
      setSpan(t);
    });
    img.addEventListener('error', function () { t._ar = 1; setSpan(t); });
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

    var act = document.createElement('div');
    act.className = 'mtile-act';
    act.innerHTML = '<button data-act="open" title="View"><i class="ti ti-arrows-maximize"></i></button>' +
      (item.type !== 'video' ? '<button data-act="save" title="Save"><i class="ti ti-download"></i></button>' : '');
    act.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (b.dataset.act === 'save') saveItem(item); else openLB(index);
      });
    });
    t.appendChild(act);
    t.appendChild(buildStrip(item));

    t.addEventListener('click', function (e) {
      if (e.target.closest('.mrxns') || e.target.closest('.mtile-act')) return;
      openLB(index);
    });
    addLongPress(t, function () { saveItem(item); });
    return t;
  }

  function setSpan(t) {
    var grid = $id('m-grid'); if (!grid) return;
    var w = t.clientWidth; if (!w) return;
    var gap = parseFloat(getComputedStyle(grid).rowGap) || 12, row = 6;
    var h = w * (t._ar || 1.2);
    t.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((h + gap) / (row + gap)));
  }

  function relayout() {
    var grid = $id('m-grid'); if (!grid) return;
    [].forEach.call(grid.children, function (t) { setSpan(t); });
  }

  function addLongPress(el, cb) {
    var timer = null, sx, sy;
    el.addEventListener('touchstart', function (e) {
      var tc = e.touches[0]; sx = tc.clientX; sy = tc.clientY;
      timer = setTimeout(function () {
        timer = null;
        el.classList.add('pressing');
        setTimeout(function () { el.classList.remove('pressing'); }, 220);
        cb();
      }, 550);
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (!timer) return;
      var tc = e.touches[0];
      if (Math.abs(tc.clientX - sx) > 8 || Math.abs(tc.clientY - sy) > 8) { clearTimeout(timer); timer = null; }
    }, { passive: true });
    var clr = function () { if (timer) { clearTimeout(timer); timer = null; } };
    el.addEventListener('touchend', clr, { passive: true });
    el.addEventListener('touchcancel', clr, { passive: true });
  }

  /* ---------- lightbox ---------- */
  function openLB(i) {
    lbIndex = i; lbOpen = true;
    var lb = $id('m-lb');
    lb.classList.add('on'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showLB();
  }

  function closeLB() {
    lbOpen = false;
    var lb = $id('m-lb');
    lb.classList.remove('on'); lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    $id('m-lb-media').innerHTML = '';
  }

  function nav(d) {
    if (!view.length) return;
    lbIndex = (lbIndex + d + view.length) % view.length;
    showLB();
  }

  function showLB() {
    var it = view[lbIndex]; if (!it) return;
    var media = $id('m-lb-media');
    media.innerHTML = '';
    var spin = document.createElement('div');
    spin.className = 'mlb-spin';
    $id('m-lb-stage').appendChild(spin);
    function rm() { if (spin.parentNode) spin.parentNode.removeChild(spin); }

    if (it.type === 'video') {
      var v = document.createElement('video');
      v.src = it.url; v.controls = true; v.autoplay = true;
      v.playsInline = true; v.preload = 'auto'; v.poster = it.thumbnailUrl || '';
      v.addEventListener('loadeddata', rm); v.addEventListener('error', rm);
      media.appendChild(v); rm();
    } else {
      var im = new Image();
      im.onload = rm; im.onerror = rm; im.src = it.url; im.alt = '';
      media.appendChild(im);
      var bh = document.createElement('div');
      bh.className = 'mlb-bigheart'; bh.textContent = '❤️'; bh.id = 'm-bigheart';
      media.appendChild(bh);
      [1, -1].forEach(function (d2) {
        var n = view[(lbIndex + d2 + view.length) % view.length];
        if (n && n.type !== 'video') { var p = new Image(); p.src = n.url; }
      });
    }
    $id('m-lb-count').textContent = (lbIndex + 1) + ' / ' + view.length;
    $id('m-lb-date').textContent = fmtDate(it.uploaded);
    var saveL = $id('m-lb-save-l'), saveBtn = $id('m-lb-save');
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
    var stage = $id('m-lb-stage');
    var sx = 0, sy = 0, t0 = 0, active = false, lastTap = 0;
    stage.addEventListener('touchstart', function (e) {
      if (e.target.closest('video')) return;
      var tc = e.changedTouches[0]; sx = tc.clientX; sy = tc.clientY; t0 = Date.now(); active = true;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (!active) return; active = false;
      var tc = e.changedTouches[0];
      var dx = tc.clientX - sx, dy = tc.clientY - sy, dt = Date.now() - t0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { nav(dx < 0 ? 1 : -1); }
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { closeLB(); }
      else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) {
        var now = Date.now();
        if (now - lastTap < 300) { lastTap = 0; lbHeart(); } else lastTap = now;
      }
    }, { passive: true });
    $id('m-lb-media').addEventListener('dblclick', function (e) {
      if (e.target.tagName !== 'VIDEO') lbHeart();
    });
  }

  function lbHeart() {
    var it = view[lbIndex]; if (!it || it.type === 'video') return;
    react(it.key, 'heart');
    var bh = $id('m-bigheart');
    if (bh) { bh.classList.remove('go'); void bh.offsetWidth; bh.classList.add('go'); }
  }

  /* ---------- upload ---------- */
  function uploadOrPrompt(files) {
    if (!authed) {
      pendingFiles = files || null;
      $id('m-pw').classList.add('on');
      setTimeout(function () { $id('m-pw-in').focus(); }, 60);
      return;
    }
    if (files) doUpload(files); else $id('m-file').click();
  }

  function checkPw() {
    var inp = $id('m-pw-in'), errEl = $id('m-pw-err'), go = $id('m-pw-go');
    var cand = inp.value;
    if (!cand) { errEl.textContent = 'Please enter the password.'; return; }
    go.disabled = true; errEl.textContent = '';
    fetch(WORKER + '/validate-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cand })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        go.disabled = false;
        if (d.valid) {
          authed = true; pw = cand;
          sessionStorage.setItem('gallery_authed', '1');
          sessionStorage.setItem('gallery_pw', cand);
          $id('m-pw').classList.remove('on'); inp.value = '';
          var f = pendingFiles; pendingFiles = null;
          if (f) doUpload(f); else $id('m-file').click();
        } else { errEl.textContent = 'Incorrect password. Try again.'; }
      })
      .catch(function () { go.disabled = false; errEl.textContent = 'Network error — try again.'; });
  }

  function setProg(p) { $id('m-prog').style.width = Math.round(p * 100) + '%'; }

  function doUpload(fileList) {
    if (uploading) return;
    var res = filterFiles(fileList);
    var valid = res.valid, invalid = res.invalid;
    if (invalid.length) mtoast(invalid.length + ' file' + (invalid.length > 1 ? 's' : '') + ' skipped (unsupported)');
    if (!valid.length) return;
    if (valid.length > 10) { mtoast('Max 10 files at a time — please split into batches.'); return; }
    uploading = true; setProg(0.02);
    var uploaded = [];
    function next(i) {
      if (i >= valid.length) {
        setProg(1);
        uploaded.reverse().forEach(function (it) { items.unshift(it); });
        renderStats(); render();
        fetchReactions(uploaded.map(function (u) { return u.key; }));
        mtoast(valid.length + ' added — newest first ✓');
        setTimeout(function () { setProg(0); $id('m-prog').style.width = '0'; }, 700);
        uploading = false; return;
      }
      var file = valid[i], isVid = file.type.indexOf('video/') === 0;
      mtoast('Uploading' + (valid.length > 1 ? ' (' + (i + 1) + '/' + valid.length + ')' : '') + '…');
      (isVid ? makeVideoThumb(file) : makeThumb(file))
        .then(function (thumb) {
          return fetch(WORKER + '/gallery-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, contentType: file.type, team: TEAM, password: pw, type: isVid ? 'video' : 'image' })
          }).then(function (r) {
            if (r.status === 401) {
              authed = false;
              sessionStorage.removeItem('gallery_authed');
              sessionStorage.removeItem('gallery_pw');
              return Promise.reject('Session expired — tap Add again.');
            }
            if (!r.ok) return r.json().then(function (e) { return Promise.reject(e.error || 'Upload failed'); });
            return r.json();
          }).then(function (d) {
            return xhrPut(d.imageUploadUrl, file, function (p) { setProg((i + p * 0.6) / valid.length); })
              .then(function () { return xhrPut(d.thumbUploadUrl, thumb, function (p) { setProg((i + 0.6 + p * 0.4) / valid.length); }); })
              .then(function () {
                uploaded.push({
                  key: (isVid ? 'videos/' : 'images/') + d.key,
                  url: d.imageUrl, thumbnailUrl: d.thumbUrl,
                  type: isVid ? 'video' : 'image',
                  uploaded: new Date().toISOString(), size: file.size
                });
              });
          });
        })
        .then(function () { next(i + 1); })
        .catch(function (err) {
          mtoast(typeof err === 'string' ? err : 'Upload error');
          setProg(0); $id('m-prog').style.width = '0'; uploading = false;
        });
    }
    next(0);
  }

  function xhrPut(url, file, onProg) {
    return new Promise(function (res2, rej) {
      var x = new XMLHttpRequest();
      x.open('PUT', url);
      x.setRequestHeader('Content-Type', file.type);
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProg(e.loaded / e.total); };
      x.onload = function () { (x.status >= 200 && x.status < 300) ? res2() : rej('Storage upload failed (' + x.status + ')'); };
      x.onerror = function () { rej('Network error during upload'); };
      x.send(file);
    });
  }

  function filterFiles(list) {
    var valid = [], invalid = [];
    var okImg = /^image\/(jpeg|png|gif|webp|avif)$/, okVid = /^video\/(mp4|quicktime|webm)$/;
    [].forEach.call(list, function (f) {
      var isVid = f.type.indexOf('video/') === 0;
      if (okImg.test(f.type) || okVid.test(f.type) || /\.mov$/i.test(f.name)) {
        if (isVid && f.size > 200 * 1024 * 1024) invalid.push(f); else valid.push(f);
      } else invalid.push(f);
    });
    return { valid: valid, invalid: invalid };
  }

  function makeThumb(file) {
    return new Promise(function (res2, rej) {
      var url = URL.createObjectURL(file), img2 = new Image();
      img2.onload = function () {
        var max = 1100, w = img2.naturalWidth, h = img2.naturalHeight;
        var s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img2, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res2(b) : rej('thumb failed'); }, 'image/jpeg', 0.82);
      };
      img2.onerror = function () { URL.revokeObjectURL(url); rej('image read failed'); };
      img2.src = url;
    });
  }

  function makeVideoThumb(file) {
    return new Promise(function (res2, rej) {
      var url = URL.createObjectURL(file), v = document.createElement('video');
      v.preload = 'metadata'; v.muted = true; v.playsInline = true;
      var done = false;
      var fail = function () { if (done) return; done = true; URL.revokeObjectURL(url); rej('video read failed'); };
      v.onloadeddata = function () { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (e) { fail(); } };
      v.onseeked = function () {
        if (done) return; done = true;
        var max = 1100, w = v.videoWidth || 640, h = v.videoHeight || 360;
        var s = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(v, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res2(b) : rej('vthumb failed'); }, 'image/jpeg', 0.82);
      };
      v.onerror = fail;
      setTimeout(function () { if (!done) fail(); }, 15000);
      v.src = url;
    });
  }

  /* ---------- drag & drop ---------- */
  function bindDrag() {
    var ov = $id('m-drag'), depth = 0;
    var show = function () { ov.classList.add('on'); };
    var hide = function () { ov.classList.remove('on'); };
    window.addEventListener('dragenter', function (e) {
      if (!e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
      e.preventDefault(); depth++; show();
    });
    window.addEventListener('dragover', function (e) { if (ov.classList.contains('on')) e.preventDefault(); });
    window.addEventListener('dragleave', function () { depth--; if (depth <= 0) { depth = 0; hide(); } });
    window.addEventListener('drop', function (e) {
      if (ov.classList.contains('on')) {
        e.preventDefault(); depth = 0; hide();
        if (e.dataTransfer.files && e.dataTransfer.files.length) uploadOrPrompt(e.dataTransfer.files);
      }
    });
  }

  /* ---------- save / share ---------- */
  function saveItem(item) {
    var fname = (item.key || 'media').split('/').pop().split('?')[0] ||
      (item.type === 'video' ? 'video.mp4' : 'photo.jpg');
    mtoast(canShareFiles ? 'Preparing…' : 'Downloading…');
    fetch(item.url, { mode: 'cors' })
      .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
      .then(function (blob) {
        if (canShareFiles) {
          var f2 = new File([blob], fname, { type: blob.type || 'application/octet-stream' });
          if (navigator.canShare && navigator.canShare({ files: [f2] })) {
            return navigator.share({ files: [f2] })
              .then(function () { mtoast('Shared ✓'); })
              .catch(function (err) { if (err && err.name === 'AbortError') return; blobDownload(blob, fname); });
          }
        }
        blobDownload(blob, fname); mtoast('Saved ✓');
      })
      .catch(function () {
        var a = document.createElement('a');
        a.href = item.url; a.download = fname; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      });
  }

  function blobDownload(blob, fname) {
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  /* ---------- utils ---------- */
  function fmtDate(iso) {
    var t = Date.parse(iso); if (!t) return '';
    try { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; }
  }

  function mtoast(msg) {
    var el = $id('m-toast'); if (!el) return;
    el.textContent = msg; el.classList.add('on');
    clearTimeout(_tt); _tt = setTimeout(function () { el.classList.remove('on'); }, 2400);
  }

  /* ---------- boot ---------- */
  function boot() {
    TEAM = window._GALLERY_TEAM || '14red';
    authed = sessionStorage.getItem('gallery_authed') === '1';
    pw = sessionStorage.getItem('gallery_pw') || '';
    device = getDevice();
    var _visitKey = 'gallery_last_' + TEAM;
    lastVisit = parseInt(localStorage.getItem(_visitKey)) || 0;
    try { localStorage.setItem(_visitKey, Date.now()); } catch (e) {}
    canShareFiles = !!(navigator.canShare && (function () {
      try { return navigator.canShare({ files: [new File([new Blob(['x'])], 'x.jpg', { type: 'image/jpeg' })] }); }
      catch (e) { return false; }
    })());

    document.querySelectorAll('#m-filters .mfilter').forEach(function (b) {
      b.addEventListener('click', function () {
        if (filter === b.dataset.f) return;
        filter = b.dataset.f;
        document.querySelectorAll('#m-filters .mfilter').forEach(function (x) {
          x.classList.toggle('on', x === b);
        });
        render();
      });
    });

    var addClick = function () { uploadOrPrompt(null); };
    var addBtn = $id('m-add'), fabBtn = $id('m-fab'), emptyAdd = $id('m-empty-add');
    if (addBtn) addBtn.addEventListener('click', addClick);
    if (fabBtn) fabBtn.addEventListener('click', addClick);
    if (emptyAdd) emptyAdd.addEventListener('click', addClick);

    var retryBtn = $id('m-retry');
    if (retryBtn) retryBtn.addEventListener('click', function () { fetchList(); });
    var refreshBtn = $id('m-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function () { mtoast('Refreshing…'); fetchList(true); });
    var fileIn = $id('m-file');
    if (fileIn) fileIn.addEventListener('change', function (e) { doUpload(e.target.files); e.target.value = ''; });

    var pwGo = $id('m-pw-go');
    if (pwGo) pwGo.addEventListener('click', checkPw);
    var pwIn = $id('m-pw-in');
    if (pwIn) pwIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') checkPw(); });
    var pwCancel = $id('m-pw-cancel');
    if (pwCancel) pwCancel.addEventListener('click', function () { $id('m-pw').classList.remove('on'); pendingFiles = null; });

    var lbClose = $id('m-lb-close');
    if (lbClose) lbClose.addEventListener('click', closeLB);
    var lbPrev = $id('m-lb-prev');
    if (lbPrev) lbPrev.addEventListener('click', function () { nav(-1); });
    var lbNext = $id('m-lb-next');
    if (lbNext) lbNext.addEventListener('click', function () { nav(1); });
    var lbSave = $id('m-lb-save');
    if (lbSave) lbSave.addEventListener('click', function () { var it = view[lbIndex]; if (it) saveItem(it); });

    document.querySelectorAll('#m-lb-rxns .mlb-rxn').forEach(function (b) {
      b.addEventListener('click', function () {
        var it = view[lbIndex];
        if (it) { react(it.key, b.dataset.r); popEl(b); }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (!$id('m-lb').classList.contains('on')) return;
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    });

    bindLBGestures();
    bindPicker();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) appendBatch();
      }, { rootMargin: '600px' });
      io.observe($id('m-sentinel'));
    }
    var st;
    window.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(maybeFill, 120); }, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 140); }, { passive: true });

    bindDrag();
    fetchList();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
