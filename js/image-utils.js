/* ===== IMAGE UTILITIES ===== */

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];

// Returns { valid, invalid } arrays from a FileList or array
function filterImageFiles(files) {
  const arr = Array.from(files);
  return {
    valid:   arr.filter(f =>  ACCEPTED_IMAGE_TYPES.includes(f.type)),
    invalid: arr.filter(f => !ACCEPTED_IMAGE_TYPES.includes(f.type)),
  };
}

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
