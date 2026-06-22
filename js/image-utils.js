/* ===== IMAGE UTILITIES ===== */

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_MEDIA_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// iOS Camera Roll often omits f.type — infer from extension as fallback
const EXT_TO_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

function resolveType(f) {
  if (f.type) return f.type;
  const ext = (f.name || '').split('.').pop().toLowerCase();
  return EXT_TO_MIME[ext] || '';
}

// Returns { valid, invalid } — invalid items may have a .reason string
function filterMediaFiles(files) {
  const arr = Array.from(files);
  const valid = [], invalid = [];
  arr.forEach(function(f) {
    const type = resolveType(f);
    if (!ACCEPTED_MEDIA_TYPES.includes(type)) {
      invalid.push(Object.assign(f, { reason: 'unsupported type' }));
    } else if (ACCEPTED_VIDEO_TYPES.includes(type) && f.size > MAX_VIDEO_SIZE) {
      invalid.push(Object.assign(f, { reason: 'video too large (max 100 MB)' }));
    } else {
      // On iOS, f.type is often "". Wrap in a new File so downstream code
      // (xhrPut Content-Type, worker contentType param) sees the correct MIME type.
      valid.push(!f.type ? new File([f], f.name, { type: type, lastModified: f.lastModified }) : f);
    }
  });
  return { valid, invalid };
}

function filterImageFiles(files) {
  const arr = Array.from(files);
  return {
    valid:   arr.filter(f =>  ACCEPTED_IMAGE_TYPES.includes(f.type)),
    invalid: arr.filter(f => !ACCEPTED_IMAGE_TYPES.includes(f.type)),
  };
}

window.filterMediaFiles = filterMediaFiles;
window.filterImageFiles = filterImageFiles;

async function maybeResize(file) {
  const MAX = 1600;
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  if (img.width <= MAX && img.height <= MAX) return file;

  const scale = MAX / Math.max(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
      'image/jpeg',
      0.85
    );
  });
}

window.maybeResize = maybeResize;

function grayPlaceholder(name) {
  var canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 2;
  canvas.getContext('2d').fillStyle = '#888';
  canvas.getContext('2d').fillRect(0, 0, 2, 2);
  return new Promise(function(resolve) {
    canvas.toBlob(function(blob) {
      resolve(new File([blob || new Blob()], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.85);
  });
}

async function makeThumb(file) {
  const MAX = 1600;
  const img = new Image();
  const url = URL.createObjectURL(file);

  const loaded = await new Promise(resolve => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
  URL.revokeObjectURL(url);

  if (!loaded) return grayPlaceholder(file.name);

  const scale = (img.width > MAX || img.height > MAX)
    ? MAX / Math.max(img.width, img.height)
    : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  try {
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    return grayPlaceholder(file.name);
  }

  return new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(new File([blob || new Blob()], file.name, { type: 'image/jpeg' })),
      'image/jpeg',
      0.85
    );
  });
}

window.makeThumb = makeThumb;

function makeVideoThumb(file) {
  return new Promise(function(resolve) {
    var video = document.createElement('video');
    var objectUrl = URL.createObjectURL(file);
    var done = false;
    var fallbackTimer = null;

    function cleanup() {
      if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
      URL.revokeObjectURL(objectUrl);
    }

    function captureFrame() {
      if (done) return;
      done = true;
      cleanup();
      var MAX = 1600;
      var w = video.videoWidth || 640;
      var h = video.videoHeight || 360;
      var scale = (w > MAX || h > MAX) ? MAX / Math.max(w, h) : 1;
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      var ctx = canvas.getContext('2d');
      try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch (e) {}
      canvas.toBlob(function(blob) {
        resolve(new File([blob || new Blob()], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    }

    function useFallback() {
      if (done) return;
      done = true;
      cleanup();
      grayPlaceholder(file.name.replace(/\.[^.]+$/, '.jpg')).then(resolve);
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = objectUrl;

    video.onloadedmetadata = function() {
      video.currentTime = Math.min(1, video.duration * 0.1);
      // iOS Safari sometimes never fires onseeked — bail after 8s
      fallbackTimer = setTimeout(useFallback, 8000);
    };

    video.onseeked = captureFrame;

    // onerror resolves with fallback rather than rejecting so upload still proceeds
    video.onerror = useFallback;

    video.load();
  });
}

window.makeVideoThumb = makeVideoThumb;
