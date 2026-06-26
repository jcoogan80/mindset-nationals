/* ===== SWIPE BETWEEN MAIN SECTIONS ===== */
(() => {
  let startX = 0;
  let startY = 0;
  let startT = 0;
  let tracking = false;
  let startEl = null;

  const sectionTabs = () => [...document.querySelectorAll('.tab[data-tab]')];
  const blocked = (el) => !!el?.closest?.('.tabs,.dtabs,.spot,.lbx,table,.st,input,textarea,select,[contenteditable="true"],.trwrap,.pwrap,details,.thermo-wrap');

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    startEl = e.target;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    if (document.body.classList.contains('em')) return;
    const sp = document.getElementById('spot');
    const lb = document.querySelector('.lbx');
    if (sp?.classList.contains('on') || lb?.classList.contains('on')) return;
    if (blocked(startEl)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startT;
    if (dt > 700) return;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const arr = sectionTabs();
    const ai = arr.findIndex((t2) => t2.classList.contains('active'));
    if (ai < 0) return;
    const ni = ai + (dx < 0 ? 1 : -1);
    if (ni < 0 || ni >= arr.length) return;
    arr[ni].click();
  }, { passive: true });
})();
