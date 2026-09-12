import { purgeCache } from '@netlify/functions';
import { CACHE_TAG } from './config.mts';

export function withCacheHeaders(headers: HeadersInit = {}): Headers {
  const h = new Headers(headers);
  // Purge-on-publish (see purgeBlogCache below) is the primary invalidation path, but a
  // durable, effectively-infinite max-age means any edit that a purge fails to reach (seen
  // in practice: purge-by-tag via a regular personal access token accepted the request but
  // never evicted an already-cached entry) stays stuck for up to a year with no fallback.
  // A short max-age gives every edit a hard upper bound on how stale it can ever get, at
  // the cost of a bit more origin traffic — a fine trade for a low-traffic blog.
  h.set('Netlify-CDN-Cache-Control', 'no-store');
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
