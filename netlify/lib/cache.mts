export function withCacheHeaders(headers: HeadersInit = {}): Headers {
  const h = new Headers(headers);
  // Durable CDN caching (1yr + purge-on-publish) was tried and dropped: purging by tag via a
  // regular personal-access token (the only kind available outside the Netlify UI) accepted
  // the request (202) but reliably failed to evict an already-cached entry — confirmed over
  // 40+ minutes and half a dozen purge attempts on a real edit. A cache that a code-correct,
  // data-correct fix can't reliably invalidate is worse than no cache: readers would see
  // stale content indefinitely with no way for the author to know or fix it. This is a
  // low-traffic personal blog, so paying a function invocation + a strongly-consistent blob
  // read on every request is a fine trade for edits always being visible immediately.
  h.set('Netlify-CDN-Cache-Control', 'no-store');
  return h;
}

export function noStoreHeaders(headers: HeadersInit = {}): Headers {
  const h = new Headers(headers);
  h.set('Cache-Control', 'no-store');
  return h;
}

/** No-op now that public pages are served no-store (see withCacheHeaders) — kept so call
 *  sites in api.mts don't need to change if CDN caching is ever reintroduced later. */
export async function purgeBlogCache(): Promise<void> {}
