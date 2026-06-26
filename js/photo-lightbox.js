/* ===== PHOTO LIGHTBOX (gallery + team photo) ===== */
(() => {
  let lbx;
  let lbxImg;
  let lbxCount;
  let curImgs = [];
  let curKeys = null;
  let idx = 0;
  let auto = null;

  const LBX_EMOJIS = { heart: '❤️', thumbsup: '👍', laughing: '😂' };
  const LBX_TYPES = ['heart', 'thumbsup', 'laughing'];

  const setPlayIcon = () => {
    const b = lbx?.querySelector('.lbx-play i');
    if (b) b.className = 'ti ' + (auto ? 'ti-player-pause-filled' : 'ti-player-play-filled');
  };
  const stopAuto = () => { if (auto) { clearInterval(auto); auto = null; } setPlayIcon(); };
  const startAuto = () => {
    if (curImgs.length < 2) return;
    stopAuto();
    auto = setInterval(() => go(1), 3500);
    setPlayIcon();
  };
  const toggleAuto = () => { if (auto) stopAuto(); else startAuto(); };

  function renderReactions() {
    if (!lbx) return;
    const bar = lbx.querySelector('.lbx-reactions');
    if (!bar) return;
    if (!curKeys || !window.GalleryReactions) { bar.style.display = 'none'; return; }
    const key = curKeys[idx];
    if (!key) { bar.style.display = 'none'; return; }
    const entry = window.GalleryReactions.getMap()[key]
      || { counts: { heart: 0, thumbsup: 0, laughing: 0 }, mine: null };
    bar.style.display = '';
    bar.innerHTML = LBX_TYPES.map((type) => {
      const count = entry.counts[type] || 0;
      const mine = entry.mine === type;
      return `<button class="lbx-rxn-btn${mine ? ' lbx-rxn-btn--mine' : ''}" data-r="${type}">${LBX_EMOJIS[type]}<span>${count}</span></button>`;
    }).join('');
  }

  function render() {
    lbxImg.src = curImgs[idx] || '';
    const multi = curImgs.length > 1;
    lbxCount.textContent = multi ? `${idx + 1} / ${curImgs.length}` : '';
    lbx.querySelector('.prev').style.display = multi ? '' : 'none';
    lbx.querySelector('.next').style.display = multi ? '' : 'none';
    const pb = lbx.querySelector('.lbx-play');
    if (pb) { pb.style.display = multi ? '' : 'none'; if (!multi) stopAuto(); }
    renderReactions();
  }

  function go(d) {
    if (!curImgs.length) return;
    idx = (idx + d + curImgs.length) % curImgs.length;
    render();
  }

  function close() {
    if (!lbx) return;
    stopAuto();
    lbx.classList.remove('on');
    lbx.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function build() {
    lbx = document.createElement('div');
    lbx.className = 'lbx';
    lbx.setAttribute('aria-hidden', 'true');
    lbx.innerHTML =
      '<button class="lbx-close" aria-label="Close"><i class="ti ti-x"></i></button>' +
      '<button class="lbx-play" aria-label="Play slideshow"><i class="ti ti-player-play-filled"></i></button>' +
      '<button class="lbx-nav prev" aria-label="Previous"><i class="ti ti-chevron-left"></i></button>' +
      '<div class="lbx-stage"><img class="lbx-img" alt=""></div>' +
      '<button class="lbx-nav next" aria-label="Next"><i class="ti ti-chevron-right"></i></button>' +
      '<div class="lbx-count"></div>' +
      '<div class="lbx-reactions" style="display:none"></div>';
    document.body.appendChild(lbx);
    lbxImg = lbx.querySelector('.lbx-img');
    lbxCount = lbx.querySelector('.lbx-count');
    lbx.querySelector('.lbx-close').addEventListener('click', close);
    lbx.querySelector('.lbx-play').addEventListener('click', toggleAuto);
    lbx.querySelector('.prev').addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
    lbx.querySelector('.next').addEventListener('click', (e) => { e.stopPropagation(); go(1); });
    lbx.addEventListener('click', (e) => {
      const rxnBtn = e.target.closest('.lbx-rxn-btn');
      if (rxnBtn && curKeys && window.GalleryReactions && window._GALLERY_TEAM) {
        const key = curKeys[idx];
        if (key) window.GalleryReactions.post(window._GALLERY_TEAM, key, rxnBtn.getAttribute('data-r')).then(renderReactions).catch(renderReactions);
        return;
      }
      if (e.target === lbx || e.target.classList.contains('lbx-stage')) close();
    });
    let sx = 0;
    let sy = 0;
    lbx.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lbx.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (!lbx || lbx.getAttribute('aria-hidden') === 'true') return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
  }

  function open(imgs, start, autoplay, keys) {
    curImgs = imgs;
    curKeys = keys || null;
    idx = start || 0;
    if (!lbx) build();
    render();
    lbx.classList.add('on');
    lbx.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (autoplay && imgs.length > 1) startAuto();
  }

  window.openLightbox = open;

  const galleryImgs = () => [...document.querySelectorAll('#gallery .gslot.has img')].map((im) => im.src);

  function init() {
    const g = document.getElementById('gallery');
    if (g) {
      g.addEventListener('click', (e) => {
        if (document.body.classList.contains('em')) return;
        if (e.target.closest('.gdel')) return;
        const slot = e.target.closest('.gslot');
        if (!slot || !slot.classList.contains('has')) return;
        const im = slot.querySelector('img');
        if (!im) return;
        const imgs = galleryImgs();
        let start = imgs.indexOf(im.src);
        if (start < 0) start = 0;
        open(imgs, start);
      });
    }
    const tb = document.querySelector('.team-banner');
    if (tb) tb.addEventListener('click', () => { const im = tb.querySelector('img'); if (im) open([im.src], 0); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
