/* ===== VIDEO PLAYER =====
 * window.openVideoPlayer(url)  — opens a modal <video> player
 */
(() => {
  let modal;
  let videoEl;

  const injectStyles = () => {
    const s = document.createElement('style');
    s.textContent = [
      '#vp-modal{display:none;position:fixed;inset:0;z-index:10000;}',
      '.vp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.88);cursor:pointer;}',
      '.vp-container{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
      'display:flex;flex-direction:column;align-items:center;}',
      '#vp-video{max-width:90vw;max-height:82vh;outline:none;border-radius:4px;',
      'background:#000;display:block;}',
      '.vp-close{position:absolute;top:-2.6rem;right:0;background:none;border:none;',
      'color:#fff;font-size:1.6rem;cursor:pointer;line-height:1;padding:.25rem .4rem;',
      'opacity:.8;transition:opacity .15s;}',
      '.vp-close:hover{opacity:1;}',
    ].join('');
    document.head.appendChild(s);
  };

  const closePlayer = () => {
    if (!modal) return;
    videoEl.pause();
    videoEl.src = '';
    modal.style.display = 'none';
  };

  const ensureModal = () => {
    if (modal) return;
    injectStyles();

    modal = document.createElement('div');
    modal.id = 'vp-modal';
    modal.innerHTML =
      '<div class="vp-backdrop"></div>' +
      '<div class="vp-container">' +
        '<button class="vp-close" aria-label="Close"><i class="ti ti-x"></i></button>' +
        '<video id="vp-video" controls playsinline></video>' +
      '</div>';
    document.body.appendChild(modal);

    videoEl = modal.querySelector('#vp-video');
    modal.querySelector('.vp-backdrop').addEventListener('click', closePlayer);
    modal.querySelector('.vp-close').addEventListener('click', closePlayer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display !== 'none') closePlayer();
    });
  };

  window.openVideoPlayer = (url) => {
    ensureModal();
    videoEl.src = url;
    modal.style.display = 'block';
    videoEl.play().catch(() => {});
  };
})();
