/* ===== GALLERY LOADER =====
 * Shared fetch + render logic for team gallery pages.
 *
 * Usage:
 *   GalleryLoader.init(team, onStatus);  // once at page setup
 *   GalleryLoader.load();                // initial load
 *   GalleryLoader.loadAfterUpload();     // after self-upload (no new-photo badge)
 */
(function () {
  var allImages = [];
  var pendingImages = null;
  var _team, _onStatus, _seenStoreKey, _seenKeys;

  function loadSeenKeys() {
    try {
      var raw = localStorage.getItem(_seenStoreKey);
      _seenKeys = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { _seenKeys = new Set(); }
  }

  function markAllSeen(images) {
    images.forEach(function (im) { _seenKeys.add(im.key); });
    try { localStorage.setItem(_seenStoreKey, JSON.stringify(Array.from(_seenKeys))); } catch (e) {}
  }

  function renderGallery(images, suppressNew) {
    allImages = images;
    var empty = document.getElementById('gallery-empty');
    var countEl = document.getElementById('gallery-count');

    if (!images || !images.length) {
      document.getElementById('gallery-grid').innerHTML = '';
      if (empty) empty.style.display = 'block';
      if (countEl) countEl.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    if (countEl) {
      countEl.innerHTML = '<b>' + images.length + '</b> photo' + (images.length !== 1 ? 's' : '');
    }

    // compute which keys are new (unseen), unless suppressed or first-ever visit
    var newKeys = new Set();
    if (!suppressNew && _seenKeys.size > 0) {
      images.forEach(function (im) {
        if (!_seenKeys.has(im.key)) newKeys.add(im.key);
      });
    }

    window.GalleryScroll.init({
      images: images,
      grid: document.getElementById('gallery-grid'),
      loader: document.getElementById('gallery-loader'),
      sentinel: document.getElementById('gallery-sentinel'),
      moreBtn: document.getElementById('gallery-more'),
      endEl: document.getElementById('gallery-end'),
      newKeys: newKeys,
      countEl: null,
      onOpen: function (idx) {
        window.openLightbox(allImages.map(function (im) { return im.url; }), idx);
      }
    });

    // stamp all as seen after rendering
    markAllSeen(images);

    if (newKeys.size > 0) {
      showBanner(newKeys.size);
    } else {
      hideBanner();
    }
  }

  function showBanner(count) {
    var banner = document.getElementById('gallery-new-banner');
    var msg = document.getElementById('gallery-new-msg');
    if (!banner) return;
    msg.innerHTML = '<b>' + count + '</b> new photo' + (count !== 1 ? 's' : '') + ' since your last visit';
    banner.classList.add('on');
  }

  function hideBanner() {
    var banner = document.getElementById('gallery-new-banner');
    if (banner) banner.classList.remove('on');
    pendingImages = null;
  }

function load(suppressNew) {
    hideBanner();
    fetch('https://mindset-gallery.wenga-eric.workers.dev/gallery-images?team=' + _team)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        renderGallery(d.images || [], suppressNew);
      })
      .catch(function () { if (_onStatus) _onStatus('Could not load photos.'); });
  }

  window.GalleryLoader = {
    init: function (team, onStatus) {
      _team = team;
      _onStatus = onStatus;
      _seenStoreKey = 'gallery_seen_' + team;
      loadSeenKeys();

      var applyBtn = document.getElementById('gallery-new-apply');
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          if (pendingImages) {
            renderGallery(pendingImages);
          }
          hideBanner();
        });
      }

      var dismissBtn = document.getElementById('gallery-new-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', function () {
          markAllSeen(pendingImages || allImages);
          hideBanner();
        });
      }

      var playBtn = document.getElementById('playall-gallery');
      if (playBtn) {
        playBtn.addEventListener('click', function () {
          if (allImages.length) {
            window.openLightbox(allImages.map(function (im) { return im.url; }), 0, true);
          }
        });
      }
    },
    load: function () { load(false); },
    loadAfterUpload: function () { load(true); }
  };
})();
