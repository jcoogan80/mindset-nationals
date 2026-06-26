/* ===== TAB BAR: sticky, scroll, center-active, edge fades ===== */
(() => {
  let bar;
  let tabs;
  const hdrH = () => { const h = document.querySelector('.hdr'); return h ? h.getBoundingClientRect().height : 56; };
  const setHdrVar = () => document.documentElement.style.setProperty('--hdr-h', `${Math.round(hdrH())}px`);

  const centerActive = (smooth) => {
    if (!tabs) return;
    const act = tabs.querySelector('.tab.active');
    if (!act) return;
    const rel = (act.getBoundingClientRect().left - tabs.getBoundingClientRect().left) + tabs.scrollLeft;
    let target = rel - (tabs.clientWidth - act.offsetWidth) / 2;
    target = Math.max(0, Math.min(target, tabs.scrollWidth - tabs.clientWidth));
    tabs.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
  };

  const updateFades = () => {
    if (!bar || !tabs) return;
    bar.classList.toggle('can-left', tabs.scrollLeft > 4);
    bar.classList.toggle('can-right', tabs.scrollLeft < tabs.scrollWidth - tabs.clientWidth - 4);
  };

  const updateStuck = () => {
    if (!bar) return;
    const top = bar.getBoundingClientRect().top;
    bar.classList.toggle('stuck', Math.abs(top - hdrH()) < 2.5 && window.pageYOffset > 4);
  };

  function init() {
    bar = document.getElementById('tabbar');
    tabs = document.getElementById('tabs');
    if (!bar || !tabs) return;
    setHdrVar();
    tabs.addEventListener('scroll', updateFades, { passive: true });
    window.addEventListener('resize', () => { setHdrVar(); updateFades(); centerActive(false); });
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(() => { updateStuck(); ticking = false; }); ticking = true; }
    }, { passive: true });
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => {
        setTimeout(() => centerActive(true), 0);
        const y = window.pageYOffset + bar.getBoundingClientRect().top - hdrH();
        if (window.pageYOffset > y + 2) window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
    requestAnimationFrame(() => { updateFades(); centerActive(false); updateStuck(); });
    document.fonts?.ready?.then(() => { setHdrVar(); updateFades(); centerActive(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
