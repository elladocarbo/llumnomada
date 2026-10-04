const UPLOADED = /^\/img\/[a-zA-Z0-9-]{1,100}$/;

/** URL of a resized WebP copy served by Netlify's Image CDN. Anything that isn't an uploaded
 *  image (/img/<id>) — e.g. the static SVG placeholders — is returned unchanged. */
export function imageUrl(path: string, width: number): string {
  if (!UPLOADED.test(path)) return path;
  return `/.netlify/images?url=${encodeURIComponent(path)}&w=${width}&fm=webp&q=72`;
}

/** `srcset` value for the given widths, or '' when the image can't be resized. */
export function imageSrcset(path: string, widths: number[]): string {
  if (!UPLOADED.test(path)) return '';
  return widths.map((w) => `${imageUrl(path, w)} ${w}w`).join(', ');
}
