import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { listIndex, getPostBySlug } from '../lib/store.mts';
import { newsletterEnabled } from '../lib/newsletter-config.mts';
import { isSeriesPart, seriesMembers, seriesSlug } from '../lib/series.mts';
import type { AdjacentPosts, SeriesBox } from '../lib/html.mts';
import { renderSeriesPage, isNewsletterPage, renderNewsletterPage, renderPrivacy, renderHome, renderBlogIndex, renderDestinations, renderArticle, renderAbout, render404, renderRss, renderSitemap } from '../lib/html.mts';
import { withCacheHeaders } from '../lib/cache.mts';
import { getClientIp } from '../lib/auth.mts';
import { recordHit } from '../lib/hits.mts';
import { getSummary, getMyVote } from '../lib/ratings.mts';

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

  // Numbered series parts are reached through their series page, so the general lists skip them
  // (the series' overview post, order 0, is listed like any other relat).
  const listed = (p: { status: string; series?: string; seriesOrder?: number }) => p.status === 'published' && !isSeriesPart(p);

  if (path === '/') {
    const index = (await listIndex()).filter(listed);
    return html(renderHome(index));
  }

  if (path === '/blog') {
    const index = (await listIndex()).filter(listed);
    return html(renderBlogIndex(index));
  }

  if (path === '/destinacions') {
    const index = (await listIndex()).filter(listed);
    return html(renderDestinations(index));
  }

  const seriesMatch = path.match(/^\/serie\/([^/]+)$/);
  if (seriesMatch) {
    const index = (await listIndex()).filter((p) => p.status === 'published' && p.series);
    const name = index.find((p) => seriesSlug(p.series as string) === seriesMatch[1])?.series;
    const members = name ? seriesMembers(index, name) : [];
    if (!members.length) return html(render404(), 404);
    return html(renderSeriesPage(members));
  }

  const categoryMatch = path.match(/^\/categoria\/([^/]+)$/);
  if (categoryMatch) {
    let category = '';
    try {
      category = decodeURIComponent(categoryMatch[1]);
    } catch {
      return html(render404(), 404);
    }
    const all = (await listIndex()).filter(listed);
    const posts = all.filter((p) => p.categories?.includes(category));
    if (!posts.length) return html(render404(), 404);
    return html(renderBlogIndex(posts, all, category));
  }

  if (path === '/privacitat') {
    return html(renderPrivacy());
  }

  const newsletterMatch = path.match(/^\/newsletter(?:\/([a-z-]+))?$/);
  if (newsletterMatch) {
    const kind = newsletterMatch[1] ?? '';
    if (!isNewsletterPage(kind)) return html(render404(), 404);
    return html(renderNewsletterPage(kind, { id: url.searchParams.get('id') ?? '', t: url.searchParams.get('t') ?? '' }));
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
    const ip = getClientIp(request, context);
    const [summary, myVote, index] = await Promise.all([getSummary(post.id), getMyVote(post.id, ip, sessionSecret), listIndex()]);
    // The index is sorted newest-first, so the next-older post sits after this one.
    const published = index.filter((p) => p.status === 'published' && p.slug && (!isSeriesPart(p) || p.id === post.id));
    const at = published.findIndex((p) => p.id === post.id);
    const toLink = (p?: (typeof published)[number]) => (p ? { slug: p.slug as string, title: p.seriesLabel || p.title } : undefined);
    let adjacent: AdjacentPosts | undefined = at === -1 ? undefined : { prev: toLink(published[at + 1]), next: toLink(published[at - 1]) };

    // A relat that belongs to a published series gets the series box and follows the series order.
    let seriesBox: SeriesBox | undefined;
    if (post.series) {
      const members = seriesMembers(index, post.series);
      const i = members.findIndex((m) => m.id === post.id);
      if (members.length >= 2 && i !== -1) {
        seriesBox = {
          name: post.series,
          items: members.map((m) => ({ slug: m.slug as string, label: m.seriesLabel || m.title, order: m.seriesOrder ?? 0, reading: m.reading, current: m.id === post.id })),
        };
        adjacent = {
          prev: toLink(members[i - 1]),
          next: toLink(members[i + 1]),
          prevLabel: '← Part anterior',
          nextLabel: 'Part següent →',
        };
      }
    }
    return html(renderArticle(post, { postId: post.id, summary, myVote }, adjacent, newsletterEnabled(), seriesBox));
  }

  return html(render404(), 404);
};
