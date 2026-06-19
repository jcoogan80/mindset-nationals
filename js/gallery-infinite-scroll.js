/* ===== GALLERY INFINITE SCROLL =====
 * window.GalleryScroll.init(opts)
 *
 * opts:
 *   images    [{url, ...}]   full sorted image array
 *   grid      Element        .mgallery container
 *   loader    Element        .gal-loader spinner row
 *   sentinel  Element        .gal-sentinel IntersectionObserver target
 *   moreBtn   Element        .gal-more fallback button
 *   endEl     Element        .gal-end "all caught up" message
 *   earlierEl Element        .gal-earlier "N earlier photos" indicator (optional)
 *   countEl   Element        .gal-count photo count text
 *   onOpen    Function(idx)  called when a photo is clicked
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
        el.classList.add('mphoto-pressing');
        el.addEventListener('animationend', function h() {
          el.classList.remove('mphoto-pressing');
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
    div.className = 'mphoto';

    if (isNew) {
      var badge = document.createElement('span');
      badge.className = 'mphoto-badge';
      badge.innerHTML = '<i class="ti ti-sparkles"></i> NEW';
      div.appendChild(badge);
      div.classList.add('mphoto-flash');
    }

    var img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = im.url;

    var dlBtn = document.createElement('span');
    dlBtn.className = 'mphoto-dl';
    dlBtn.setAttribute('title', 'Download');
    dlBtn.innerHTML = '<i class="ti ti-download"></i>';
    dlBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      downloadImage(im.url);
    });

    var expBtn = document.createElement('span');
    expBtn.className = 'mphoto-exp';
    expBtn.setAttribute('title', 'View full size');
    expBtn.innerHTML = '<i class="ti ti-arrows-maximize"></i>';

    var ov = document.createElement('div');
    ov.className = 'mphoto-ov';
    ov.appendChild(dlBtn);
    ov.appendChild(expBtn);

    div.appendChild(img);
    div.appendChild(ov);
    img.addEventListener('load', function () { div.classList.add('loaded'); });
    if (img.complete && img.naturalWidth) div.classList.add('loaded');
    div.addEventListener('click', onClick);
    addLongPress(div, function () { downloadImage(im.url); });
    return div;
  }

  function animateIn(el) {
    // double rAF: first ensures the element is in the DOM, second fires after paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('in'); });
    });
  }

  // release bitmap memory for old photos while preserving masonry layout height
  function ghostItems(items, ghostedCount, earlierEl) {
    items.forEach(function (el) {
      var img = el.querySelector('img');
      if (img) {
        // freeze natural dimensions so masonry column heights stay stable
        var h = img.offsetHeight;
        if (h > 0) { img.style.height = h + 'px'; img.style.width = '100%'; }
        img.src = '';
      }
      el.classList.add('mphoto-ghost');
    });
    if (earlierEl) {
      earlierEl.textContent = '↑ ' + ghostedCount + ' earlier photo' + (ghostedCount !== 1 ? 's' : '');
      earlierEl.classList.add('on');
    }
  }

  window.GalleryScroll = {
    init: function (opts) {
      var images = opts.images || [];
      var total = images.length;
      var grid = opts.grid;
      var liveItems = []; // parallel array of DOM elements for live photos
      var ghosted = 0;    // count of ghosted photos (not clickable)
      var page = 0;

      grid.innerHTML = '';

      // update count display
      if (opts.countEl) {
        opts.countEl.innerHTML = total
          ? '<b>' + total + '</b> photo' + (total !== 1 ? 's' : '')
          : '';
      }

      if (!total) return;

      function renderBatch() {
        var start = page * PAGE_SIZE;
        var batch = images.slice(start, start + PAGE_SIZE);
        if (!batch.length) return false;

        batch.forEach(function (im, bi) {
          var globalIdx = start + bi;
          var isNew = !!(opts.newKeys && opts.newKeys.has(im.key));
          var el = buildItem(im, function () {
            if (opts.onOpen) opts.onOpen(globalIdx);
          }, isNew);
          grid.appendChild(el);
          liveItems.push(el);
          animateIn(el);
        });

        page++;

        // recycle oldest batch if we've exceeded MAX_LIVE
        if (liveItems.length > MAX_LIVE) {
          var excess = liveItems.length - MAX_LIVE;
          var toGhost = liveItems.splice(0, excess);
          ghosted += toGhost.length;
          ghostItems(toGhost, ghosted, opts.earlierEl || null);
        }

        return (page * PAGE_SIZE) < total;
      }

      // render first batch
      var hasMore = renderBatch();

      if (!hasMore) {
        if (opts.endEl && total > 0) opts.endEl.style.display = '';
        if (opts.loader) opts.loader.classList.remove('on');
        return;
      }

      // IntersectionObserver auto-load
      if ('IntersectionObserver' in window && opts.sentinel) {
        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          if (opts.loader) opts.loader.classList.add('on');
          var more = renderBatch();
          if (opts.loader) opts.loader.classList.remove('on');
          if (!more) {
            io.disconnect();
            if (opts.sentinel) opts.sentinel.style.visibility = 'hidden';
            if (opts.moreBtn) opts.moreBtn.style.display = 'none';
            if (opts.endEl) opts.endEl.style.display = '';
          }
        }, { rootMargin: '300px' });
        io.observe(opts.sentinel);
      }

      // fallback manual load-more button
      if (opts.moreBtn) {
        opts.moreBtn.style.display = '';
        opts.moreBtn.addEventListener('click', function () {
          var more = renderBatch();
          if (!more) {
            opts.moreBtn.style.display = 'none';
            if (opts.endEl) opts.endEl.style.display = '';
          }
        });
      }
    }
  };
})();
