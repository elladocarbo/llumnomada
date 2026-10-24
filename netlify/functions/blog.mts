import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { listIndex, getPostBySlug, getSettings } from '../lib/store.mts';
import { newsletterEnabled } from '../lib/newsletter-config.mts';
import { isSeriesPart, seriesMembers, seriesSlug } from '../lib/series.mts';
import type { AdjacentPosts, PageOpts, SeriesBox } from '../lib/html.mts';
import { renderSeriesPage, isNewsletterPage, renderNewsletterPage, renderPrivacy, renderHome, renderBlogIndex, renderDestinations, renderArticle, renderAbout, render404, renderRss, renderSitemap } from '../lib/html.mts';
import { withCacheHeaders } from '../lib/cache.mts';
import { getClientIp, readCookie, verifySession } from '../lib/auth.mts';
import { recordHit } from '../lib/hits.mts';
import { getSummary, getMyVote } from '../lib/ratings.mts';
import { entryLangs, localizeEntry, localizePost, LANGS, splitLangPath, t, TRANS_LANGS, type Lang } from '../lib/i18n.mts';
import { LANG_PREVIEW_COOKIE } from '../lib/config.mts';

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

  // "/es/blog/x/" is the Spanish version of "/blog/x/": the prefix picks the language, the rest is
  // routed as usual. Catalan has no prefix.
  const { lang, rest } = splitLangPath(url.pathname);
  const path = rest.replace(/\/+$/, '') || '/';

  // Best-effort hit recording for real page views only — never blocks or breaks rendering.
  const sessionSecret = process.env.SESSION_SECRET ?? 'dev-secret';
  const shouldRecordHit = request.method === 'GET' && !path.startsWith('/img/') && path !== '/rss.xml' && path !== '/sitemap.xml';
  if (shouldRecordHit) {
    const ip = getClientIp(request, context);
    recordHit(path, ip, sessionSecret).catch(() => {});
  }

  // Which languages are open to everybody (settings), plus all of them for the author while she
  // previews translations (a cookie set from the panel, see /api/lang-preview).
  const settings = await getSettings();
  const previewing = Boolean(verifySession(readCookie(request, LANG_PREVIEW_COOKIE), sessionSecret));
  const enabled: Lang[] = LANGS.filter((l) => l === 'ca' || previewing || (settings.languages ?? []).includes(l as 'es' | 'en'));
  if (!enabled.includes(lang) || (lang !== 'ca' && (path === '/rss.xml' || path === '/sitemap.xml' || path.startsWith('/img/')))) {
    return html(render404(), 404);
  }
  const page: PageOpts = { lang, langs: enabled };

  // Numbered series parts are reached through their series page, so the general lists skip them
  // (the series' overview post, order 0, is listed like any other relat).
  const listed = (p: { status: string; series?: string; seriesOrder?: number }) => p.status === 'published' && !isSeriesPart(p);
  const shownEntries = async () => (await listIndex()).filter(listed).map((e) => localizeEntry(e, lang, previewing));

  if (path === '/') {
    return html(renderHome(await shownEntries(), page));
  }

  if (path === '/blog') {
    return html(renderBlogIndex(await shownEntries(), undefined, undefined, page));
  }

  if (path === '/destinacions') {
    return html(renderDestinations(await shownEntries(), page));
  }

  const seriesMatch = path.match(/^\/serie\/([^/]+)$/);
  if (seriesMatch) {
    const index = (await listIndex()).filter((p) => p.status === 'published' && p.series).map((e) => localizeEntry(e, lang, previewing));
    const name = index.find((p) => seriesSlug(p.series as string) === seriesMatch[1])?.series;
    const members = name ? seriesMembers(index, name) : [];
    if (!members.length) return html(render404(page), 404);
    return html(renderSeriesPage(members, page));
  }

  const categoryMatch = path.match(/^\/categoria\/([^/]+)$/);
  if (categoryMatch) {
    let category = '';
    try {
      category = decodeURIComponent(categoryMatch[1]);
    } catch {
      return html(render404(page), 404);
    }
    const all = await shownEntries();
    const posts = all.filter((p) => p.categories?.includes(category));
    if (!posts.length) return html(render404(page), 404);
    return html(renderBlogIndex(posts, all, category, page));
  }

  if (path === '/privacitat') {
    return html(renderPrivacy(page));
  }

  const newsletterMatch = path.match(/^\/newsletter(?:\/([a-z-]+))?$/);
  if (newsletterMatch) {
    const kind = newsletterMatch[1] ?? '';
    if (!isNewsletterPage(kind)) return html(render404(page), 404);
    return html(renderNewsletterPage(kind, { id: url.searchParams.get('id') ?? '', t: url.searchParams.get('t') ?? '' }, page));
  }

  if (path === '/about') {
    return html(renderAbout(page));
  }

  if (path === '/rss.xml') {
    const index = (await listIndex()).filter((p) => p.status === 'published');
    return new Response(renderRss(index), { headers: withCacheHeaders({ 'content-type': 'application/rss+xml; charset=utf-8' }) });
  }

  if (path === '/sitemap.xml') {
    const index = (await listIndex()).filter((p) => p.status === 'published');
    // The sitemap only lists the languages open to everybody, never the author's preview.
    const open = LANGS.filter((l) => l === 'ca' || (settings.languages ?? []).includes(l as 'es' | 'en'));
    return new Response(renderSitemap(index, open), { headers: withCacheHeaders({ 'content-type': 'application/xml; charset=utf-8' }) });
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
    if (!post || post.status !== 'published') return html(render404(page), 404);
    const ip = getClientIp(request, context);
    const [summary, myVote, fullIndex] = await Promise.all([getSummary(post.id), getMyVote(post.id, ip, sessionSecret), listIndex()]);
    const index = fullIndex.map((e) => localizeEntry(e, lang, previewing));
    const { post: shown, translated, draft } = localizePost(post, lang, previewing);

    // Languages this relat can be read in (the current one is always listed, even when it falls back to Catalan).
    const entry = fullIndex.find((e) => e.id === post.id);
    const available = new Set<Lang>(entry ? entryLangs(entry, previewing).filter((l) => enabled.includes(l)) : ['ca']);
    available.add(lang);
    const articlePage: PageOpts = {
      lang,
      langs: LANGS.filter((l) => available.has(l)),
      ...(lang !== 'ca' && !translated ? { notice: t(lang, 'notice.untranslated'), canonicalLang: 'ca' as Lang } : {}),
      ...(draft ? { notice: t(lang, 'notice.draft') } : {}),
    };

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
          name: (members[i] as { seriesName?: string }).seriesName ?? post.series,
          slug: seriesSlug(post.series),
          items: members.map((m) => ({ slug: m.slug as string, label: m.seriesLabel || m.title, order: m.seriesOrder ?? 0, reading: m.reading, current: m.id === post.id })),
        };
        adjacent = {
          prev: toLink(members[i - 1]),
          next: toLink(members[i + 1]),
          inSeries: true,
        };
      }
    }
    return html(renderArticle(shown, { postId: post.id, summary, myVote }, adjacent, newsletterEnabled(), seriesBox, articlePage));
  }

  return html(render404(page), 404);
};
