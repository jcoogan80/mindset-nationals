/* ===== IMAGE UTILITIES ===== */

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_MEDIA_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Returns { valid, invalid } — invalid items may have a .reason string
function filterMediaFiles(files) {
  const arr = Array.from(files);
  const valid = [], invalid = [];
  arr.forEach(function(f) {
    if (!ACCEPTED_MEDIA_TYPES.includes(f.type)) {
      invalid.push(Object.assign(f, { reason: 'unsupported type' }));
    } else if (ACCEPTED_VIDEO_TYPES.includes(f.type) && f.size > MAX_VIDEO_SIZE) {
      invalid.push(Object.assign(f, { reason: 'video too large (max 100 MB)' }));
    } else {
      valid.push(f);
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

async function makeThumb(file) {
  const MAX = 1600;
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const scale = (img.width > MAX || img.height > MAX)
    ? MAX / Math.max(img.width, img.height)
    : 1;
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

window.makeThumb = makeThumb;

function makeVideoThumb(file) {
  return new Promise(function(resolve, reject) {
    var video = document.createElement('video');
    var objectUrl = URL.createObjectURL(file);
    video.muted = true;
    video.preload = 'metadata';
    video.src = objectUrl;

    video.onloadedmetadata = function() {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = function() {
      var MAX = 1600;
      var scale = (video.videoWidth > MAX || video.videoHeight > MAX)
        ? MAX / Math.max(video.videoWidth, video.videoHeight)
        : 1;
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(function(blob) {
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };

    video.onerror = function() {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load video for thumbnail'));
    };
  });
}

window.makeVideoThumb = makeVideoThumb;
