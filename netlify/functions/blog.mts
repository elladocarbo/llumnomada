import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { listIndex, getPostBySlug } from '../lib/store.mts';
import { renderHome, renderBlogIndex, renderArticle, renderAbout, render404, renderRss, renderSitemap } from '../lib/html.mts';
import { withCacheHeaders } from '../lib/cache.mts';
import { getClientIp } from '../lib/auth.mts';
import { recordHit } from '../lib/hits.mts';

const CANONICAL_HOST = 'llumnomada.com';

function isPreviewHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.netlify.app');
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: withCacheHeaders({ 'content-type': 'text/html; charset=utf-8' }) });
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  if (url.hostname !== CANONICAL_HOST && !isPreviewHost(url.hostname)) {
    return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
  }

  const path = url.pathname.replace(/\/+$/, '') || '/';

  // Best-effort hit recording for real page views only — never blocks or breaks rendering.
  const sessionSecret = process.env.SESSION_SECRET ?? 'dev-secret';
  const shouldRecordHit = request.method === 'GET' && !path.startsWith('/img/') && path !== '/rss.xml' && path !== '/sitemap.xml';
  if (shouldRecordHit) {
    const ip = getClientIp(request, context);
    recordHit(path, ip, sessionSecret).catch(() => {});
  }

  if (path === '/') {
    const index = (await listIndex()).filter((p) => p.status === 'published');
    return html(renderHome(index));
  }

  if (path === '/blog') {
    const index = (await listIndex()).filter((p) => p.status === 'published');
    return html(renderBlogIndex(index));
  }

  if (path === '/about') {
    return html(renderAbout());
  }

  if (path === '/rss.xml') {
    const index = (await listIndex()).filter((p) => p.status === 'published');
    return new Response(renderRss(index), { headers: withCacheHeaders({ 'content-type': 'application/rss+xml; charset=utf-8' }) });
  }

  if (path === '/sitemap.xml') {
    const index = (await listIndex()).filter((p) => p.status === 'published');
    return new Response(renderSitemap(index), { headers: withCacheHeaders({ 'content-type': 'application/xml; charset=utf-8' }) });
  }

  if (path.startsWith('/img/')) {
    const id = path.slice('/img/'.length);
    const store = getStore('images');
    const entry = await store.getWithMetadata(id, { type: 'arrayBuffer' });
    if (!entry?.data) return html(render404(), 404);
    return new Response(entry.data, {
      headers: withCacheHeaders({ 'content-type': (entry.metadata?.type as string) ?? 'application/octet-stream' }),
    });
  }

  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const post = await getPostBySlug(blogMatch[1]);
    if (!post || post.status !== 'published') return html(render404(), 404);
    return html(renderArticle(post));
  }

  return html(render404(), 404);
};
