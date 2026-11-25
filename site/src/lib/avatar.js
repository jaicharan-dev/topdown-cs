/**
 * Turns a picked image file into a small square data URL.
 *
 * The picture is stored inside the progress blob, which goes into
 * localStorage on every flush and up to the server on every sync. A phone
 * photo is several megabytes and would blow the storage quota, so it is
 * resized here and never stored at anything like its original size.
 *
 * 128 square at JPEG quality 0.82 lands around 6KB, which is small enough to
 * ride along with the rest of the store without anybody noticing.
 */

export const AVATAR_SIZE = 128;

/** A generous ceiling; a 128px JPEG that exceeds this is not a photograph. */
export const MAX_AVATAR_BYTES = 80 * 1024;

export const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    image.src = url;
  });
}

/**
 * Centre crops to a square and scales down. Cropping rather than squashing,
 * because a stretched face is worse than a cropped one.
 */
export async function fileToAvatar(file) {
  if (!file) throw new Error('No file chosen.');
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!side) throw new Error('That image has no size.');

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot resize the image.');

  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );

  const url = canvas.toDataURL('image/jpeg', 0.82);

  // A data URL is base64, so its byte cost is about three quarters of its
  // length. Refuse rather than quietly filling the quota with one picture.
  if (url.length * 0.75 > MAX_AVATAR_BYTES) {
    throw new Error('That image is too large even after resizing.');
  }

  return url;
}

/** Up to two letters for somebody with no picture. */
export function initialsFor(name, fallback = '') {
  const source = (name || fallback || '').trim();
  if (!source) return '';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
