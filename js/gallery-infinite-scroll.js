/* ===== GALLERY INFINITE SCROLL =====
 * window.GalleryScroll.init(opts)
 *
 * opts:
 *   images    [{url, ...}]   full sorted image array
 *   grid      Element        .mgrid container
 *   loader    Element        .gal-loader spinner row
 *   sentinel  Element        .gal-sentinel IntersectionObserver target
 *   moreBtn   Element        .gal-more fallback button
 *   endEl     Element        .gal-end "all caught up" message
 *   earlierEl Element        .gal-earlier "N earlier photos" indicator (optional)
 *   countEl   Element        .gal-count photo count text
 *   filterEl  Element        #m-filters container (optional)
 *   newKeys   Set            keys of new/unseen photos
 *   onOpen    Function(im)   called when a photo/video is clicked
 */
(function () {
  var PAGE_SIZE = 20;
  var MAX_LIVE = 80; // max live (non-ghost) photos in DOM before recycling

  function downloadImage(url) {
    fetch(url)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var a = document.createElement('a');
        var objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = url.split('/').pop().split('?')[0] || 'photo.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(objUrl); }, 1000);
      })
      .catch(function () { window.open(url, '_blank'); });
  }

  function addLongPress(el, callback) {
    var timer = null;
    var startX, startY;
    el.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      timer = setTimeout(function () {
        timer = null;
        el.classList.add('mtile-pressing');
        el.addEventListener('animationend', function h() {
          el.classList.remove('mtile-pressing');
          el.removeEventListener('animationend', h);
        });
        callback();
      }, 600);
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (!timer) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { clearTimeout(timer); timer = null; }
    }, { passive: true });
    el.addEventListener('touchend', function () { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true });
    el.addEventListener('touchcancel', function () { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true });
  }

  function buildItem(im, onClick, isNew) {
    var div = document.createElement('div');
    var isVideo = im.type === 'video';
    div.className = isVideo ? 'mtile mtile--video' : 'mtile';

    // NEW sparkle badge — top-right
    if (isNew) {
      var badge = document.createElement('span');
      badge.className = 'mphoto-badge';
      badge.innerHTML = '<i class="ti ti-sparkles"></i> NEW';
      div.appendChild(badge);
    }

    // VIDEO type badge — top-left
    if (isVideo) {
      var vbadge = document.createElement('span');
      vbadge.className = 'mbadge';
      vbadge.innerHTML = '<i class="ti ti-video"></i> VIDEO';
      div.appendChild(vbadge);
    }

    // gradient overlay (fades in on hover)
    var grad = document.createElement('div');
    grad.className = 'mtile-grad';
    div.appendChild(grad);

    var img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = im.thumbnailUrl || im.url;
    div.appendChild(img);

    // centered play icon — always visible on video cards
    if (isVideo) {
      var playOv = document.createElement('div');
      playOv.className = 'mplay';
      playOv.innerHTML = '<span><i class="ti ti-player-play-filled"></i></span>';
      div.appendChild(playOv);
    }

    // action buttons overlay — slides up on hover
    var ov = document.createElement('div');
    ov.className = 'mtile-ov';

    if (isVideo) {
      var playBtn = document.createElement('button');
      playBtn.setAttribute('title', 'Play');
      playBtn.innerHTML = '<i class="ti ti-player-play-filled"></i>';
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        onClick();
      });
      ov.appendChild(playBtn);
    } else {
      var dlBtn = document.createElement('button');
      dlBtn.setAttribute('title', 'Download');
      dlBtn.innerHTML = '<i class="ti ti-download"></i>';
      dlBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        downloadImage(im.url);
      });

      var expBtn = document.createElement('button');
      expBtn.setAttribute('title', 'View full size');
      expBtn.innerHTML = '<i class="ti ti-arrows-maximize"></i>';

      ov.appendChild(dlBtn);
      ov.appendChild(expBtn);
    }

    div.appendChild(ov);

    img.addEventListener('load', function () { div.classList.add('loaded'); });
    if (img.complete && img.naturalWidth) div.classList.add('loaded');
    div.addEventListener('click', onClick);
    addLongPress(div, function () { downloadImage(im.url); });
    return div;
  }

  // release bitmap memory for old photos while preserving masonry column heights
  function ghostItems(items, ghostedCount, earlierEl) {
    items.forEach(function (el) {
      var img = el.querySelector('img');
      if (img) {
        var h = img.offsetHeight;
        if (h > 0) { img.style.height = h + 'px'; img.style.width = '100%'; }
        img.src = '';
      }
      el.classList.add('mtile-ghost');
    });
    if (earlierEl) {
      earlierEl.textContent = '↑ ' + ghostedCount + ' earlier photo' + (ghostedCount !== 1 ? 's' : '');
      earlierEl.classList.add('on');
    }
  }

  window.GalleryScroll = {
    init: function (opts) {
      var allImages = opts.images || [];
      var images = allImages; // current (possibly filtered) set
      var filter = 'all';
      var grid = opts.grid;
      var cols = [];
      var colIdx = 0;
      var liveItems = [];
      var ghosted = 0;
      var page = 0;
      var io = null;

      function initCols() {
        grid.innerHTML = '';
        cols = [];
        var n = window.innerWidth >= 960 ? 4 : window.innerWidth >= 640 ? 3 : 2;
        for (var i = 0; i < n; i++) {
          var col = document.createElement('div');
          col.className = 'mcol';
          grid.appendChild(col);
          cols.push(col);
        }
      }

      initCols();

      if (opts.countEl) {
        opts.countEl.innerHTML = allImages.length
          ? '<b>' + allImages.length + '</b> photo' + (allImages.length !== 1 ? 's' : '')
          : '';
      }

      // compute counts for filter pills + stats boxes
      var counts = { all: allImages.length, image: 0, video: 0 };
      allImages.forEach(function (im) {
        if (im.type === 'video') counts.video++;
        else counts.image++;
      });

      // populate count pills and wire filter buttons
      if (opts.filterEl) {
        opts.filterEl.querySelectorAll('[data-c]').forEach(function (el) {
          var n = counts[el.dataset.c];
          if (n != null) el.textContent = n;
        });
        opts.filterEl.querySelectorAll('.mfilter').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (filter === btn.dataset.f) return;
            filter = btn.dataset.f;
            opts.filterEl.querySelectorAll('.mfilter').forEach(function (b) {
              b.classList.toggle('on', b === btn);
            });
            resetAndRender();
          });
        });
      }

      // populate stats boxes (Photos / Videos count cards)
      if (opts.statsEl) {
        opts.statsEl.innerHTML =
          mstat(counts.image, 'Photos', 'ti-photo') +
          mstat(counts.video, 'Videos', 'ti-player-play');
      }

      function mstat(n, label, icon) {
        return '<div class="mstat"><div class="mstat-val"><i class="ti ' + icon + '"></i><span>' + n + '</span></div><div class="mstat-lbl">' + label + '</div></div>';
      }

      // wire moreBtn once (renderBatch reads page/images from closure)
      if (opts.moreBtn) {
        opts.moreBtn.addEventListener('click', function () {
          var more = renderBatch();
          if (!more) {
            opts.moreBtn.style.display = 'none';
            if (opts.endEl) opts.endEl.style.display = '';
          }
        });
      }

      function renderBatch() {
        var total = images.length;
        var start = page * PAGE_SIZE;
        var batch = images.slice(start, start + PAGE_SIZE);
        if (!batch.length) return false;

        var colFrags = cols.map(function () { return document.createDocumentFragment(); });
        batch.forEach(function (im, bi) {
          var isNew = !!(opts.newKeys && opts.newKeys.has(im.key));
          var el = buildItem(im, function () {
            if (opts.onOpen) opts.onOpen(im);
          }, isNew);
          // stagger one visual row at a time
          var delay = Math.floor(bi / cols.length) * 50;
          if (delay) el.style.animationDelay = delay + 'ms';
          colFrags[colIdx % cols.length].appendChild(el);
          liveItems.push(el);
          colIdx++;
        });
        cols.forEach(function (col, i) { col.appendChild(colFrags[i]); });

        page++;

        // recycle oldest batch when we've exceeded MAX_LIVE
        if (liveItems.length > MAX_LIVE) {
          var excess = liveItems.length - MAX_LIVE;
          var toGhost = liveItems.splice(0, excess);
          ghosted += toGhost.length;
          ghostItems(toGhost, ghosted, opts.earlierEl || null);
        }

        return (page * PAGE_SIZE) < total;
      }

      function setupScroll() {
        if (!images.length) return;

        var hasMore = renderBatch();

        if (!hasMore) {
          if (opts.endEl) opts.endEl.style.display = '';
          if (opts.loader) opts.loader.classList.remove('on');
          return;
        }

        if ('IntersectionObserver' in window && opts.sentinel) {
          io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            if (opts.loader) opts.loader.classList.add('on');
            var more = renderBatch();
            if (opts.loader) opts.loader.classList.remove('on');
            if (!more) {
              io.disconnect();
              io = null;
              if (opts.sentinel) opts.sentinel.style.visibility = 'hidden';
              if (opts.moreBtn) opts.moreBtn.style.display = 'none';
              if (opts.endEl) opts.endEl.style.display = '';
            }
          }, { rootMargin: '300px' });
          io.observe(opts.sentinel);
        }

        if (opts.moreBtn) opts.moreBtn.style.display = '';
      }

      function resetAndRender() {
        images = filter === 'all'
          ? allImages
          : allImages.filter(function (im) { return (im.type || 'image') === filter; });
        page = 0;
        liveItems = [];
        ghosted = 0;
        colIdx = 0;
        initCols();
        if (io) { io.disconnect(); io = null; }
        if (opts.endEl) opts.endEl.style.display = 'none';
        if (opts.moreBtn) opts.moreBtn.style.display = 'none';
        if (opts.loader) opts.loader.classList.remove('on');
        if (opts.sentinel) opts.sentinel.style.visibility = '';
        if (opts.earlierEl) opts.earlierEl.classList.remove('on');
        setupScroll();
      }

      if (!allImages.length) return;
      setupScroll();
    }
  };
})();
