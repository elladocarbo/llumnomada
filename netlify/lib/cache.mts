import { purgeCache } from '@netlify/functions';
import { CACHE_TAG } from './config.mts';

export function withCacheHeaders(headers: HeadersInit = {}): Headers {
  const h = new Headers(headers);
  h.set('Netlify-CDN-Cache-Control', 'public, durable, max-age=31536000, stale-while-revalidate=60');
  h.set('Netlify-Cache-Tag', CACHE_TAG);
  return h;
}

export function noStoreHeaders(headers: HeadersInit = {}): Headers {
  const h = new Headers(headers);
  h.set('Cache-Control', 'no-store');
  return h;
}

/** Purges the public site's cache tag so an edit/publish shows up instantly, no rebuild. Best-effort: not available in local dev, so failures there are swallowed. */
export async function purgeBlogCache(): Promise<void> {
  try {
    await purgeCache({ tags: [CACHE_TAG] });
  } catch {
    // Not available locally (netlify dev) or transient API error — the next durable-cache
    // revalidation window will pick up the change regardless.
  }
}
