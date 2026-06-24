/* ===== MODERN SCROLL EFFECTS (self-contained) ===== */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js-reveal');

  // First-serve date: shared single source from hub.js, with a literal fallback.
  const FIRST_SERVE = window.FIRST_SERVE ?? '2026-06-25T08:00:00';

  function animateCount(el) {
    const orig = (el.textContent || '').trim();
    const m = orig.match(/^(\D*?)([\d,]*\.?\d+)(\D*)$/);
    if (!m) return;
    const [, prefix, numStr, suffix] = m;
    const decimals = (numStr.split('.')[1] || '').length;
    const target = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(target)) return;
    const dur = 1200;
    let start = null;
    el.textContent = prefix + (decimals ? (0).toFixed(decimals) : '0') + suffix;
    const frame = (ts) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const e = 1 - (1 - p) ** 3;
      const val = target * e;
      el.textContent = prefix + (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = orig;
    };
    requestAnimationFrame(frame);
  }

  function init() {
    /* hero logo mirrors the header emblem */
    try {
      const hh = document.getElementById('hdr-logo');
      const hl = document.getElementById('hero-logo');
      if (hl && hh?.src) hl.src = hh.src;
    } catch (e) { /* ignore */ }

    /* hero entrance */
    const hero = document.getElementById('hero');
    if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('ready')));

    /* reveal-on-scroll */
    const sel = ['.team-banner', '.stat-row', '.trwrap', '.sec-hd', '.card', '.pcard', '.rcard', '.fev', '.thermo-wrap', '.flog-wrap', '.donor-wrap', 'table.st', '.pki', '.ggrid', '.ubanner'];
    const nodes = [];
    sel.forEach((s) => {
      document.querySelectorAll(s).forEach((n) => { if (!n.closest('.hero')) nodes.push(n); });
    });
    const groups = {};
    nodes.forEach((n) => {
      n.setAttribute('data-reveal', '');
      const key = n.parentElement ? (n.parentElement.className || 'p') : 'p';
      const i = (groups[key] = (groups[key] || 0));
      groups[key]++;
      const d = Math.min(i * 60, 300);
      if (d) n.style.transitionDelay = `${d}ms`;
    });
    if (reduce || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('reveal-in'));
    } else {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('reveal-in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
      nodes.forEach((n) => io.observe(n));
    }

    /* count-up on stat banner */
    const statRow = document.querySelector('.stat-row');
    if (statRow && !reduce && ('IntersectionObserver' in window)) {
      const io2 = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting) {
            statRow.querySelectorAll('.spn').forEach((el) => animateCount(el));
            io2.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io2.observe(statRow);
    }

    /* scroll-linked fx */
    const hdr = document.querySelector('.hdr');
    const prog = document.getElementById('scroll-progress');
    const toTop = document.getElementById('to-top');
    const heroInner = hero ? hero.querySelector('.hero-inner') : null;
    const cue = hero ? hero.querySelector('.hero-cue') : null;
    let ticking = false;
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop || 0;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.width = `${docH > 0 ? Math.min(100, (y / docH) * 100) : 0}%`;
      if (hdr) hdr.classList.toggle('scrolled', y > 40);
      if (toTop) toTop.classList.toggle('on', y > window.innerHeight * 0.55);
      if (heroInner && !reduce && y < window.innerHeight * 1.15) {
        heroInner.style.transform = `translateY(${y * 0.3}px)`;
        const o = 1 - y / (window.innerHeight * 0.72);
        heroInner.style.opacity = o < 0 ? 0 : o;
      }
      if (cue) cue.style.opacity = y > 30 ? '0' : '';
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
    onScroll();
    if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

    /* hero countdown */
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date(FIRST_SERVE) - new Date();
      const ids = ['hcd-d', 'hcd-h', 'hcd-m', 'hcd-s'];
      if (d <= 0) { ids.forEach((id) => { const e = document.getElementById(id); if (e) e.textContent = '00'; }); return; }
      const map = {
        'hcd-d': Math.floor(d / 86400000),
        'hcd-h': Math.floor((d % 86400000) / 3600000),
        'hcd-m': Math.floor((d % 3600000) / 60000),
        'hcd-s': Math.floor((d % 60000) / 1000),
      };
      Object.keys(map).forEach((id) => { const e = document.getElementById(id); if (e) e.textContent = pad(map[id]); });
    };
    tick();
    setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
