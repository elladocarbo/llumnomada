import type { Block, IndexEntry, Place, Post, PostInfo } from './types.mts';
import { SITE, SITE_NAME, AUTHOR_NAME, AUTHOR_LEGAL_NAME, CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from './config.mts';
import { decodeHtmlEntities, escapeHtml } from './sanitize.mts';
import { renderBlocks, renderToc } from './blocks.mts';
import { ABOUT_BLOCKS, ABOUT_COVER, ABOUT_DESCRIPTION, ABOUT_LEAD, ABOUT_SUMMARY, ABOUT_TITLE } from '../seed/about.mts';
import { ABOUT_BLOCKS_ES, ABOUT_ES } from '../seed/about-es.mts';
import { ABOUT_BLOCKS_EN, ABOUT_EN } from '../seed/about-en.mts';
import { privacyBody } from '../seed/privacy.mts';
import { type RatingSummary } from './ratings.mts';
import { imageSrcset, imageUrl } from './images.mts';
import { MAP_H, MAP_W, mapView, projectLatLon } from './worldmap.mts';
import { cityHeight, cityMapFor, projectCity } from './citymap.mts';
import { newsletterEnabled } from './newsletter-config.mts';
import { seriesSlug } from './series.mts';
import { slugify } from './slug.mts';
import { categoryName, countryName, entryLangs, formatDateLang, HTML_LANG, LANG_LABEL, LANG_NAME, lp, OG_LOCALE, t, type Lang, type UiKey } from './i18n.mts';

/** Which language a page is rendered in, and in which languages the same page exists (the language
 *  switch and the hreflang links are built from `langs`). Defaults to plain Catalan. */
export interface PageOpts {
  lang: Lang;
  langs: Lang[];
  /** Small notice shown above the content (a translation that is a draft, or missing). */
  notice?: string;
  /** Language whose URL is the canonical one when the text shown is not in `lang` (an untranslated relat). */
  canonicalLang?: Lang;
}
const CA_ONLY: PageOpts = { lang: 'ca', langs: ['ca'] };

// Responsive WebP copies of an uploaded cover image (see images.mts); static SVGs pass through.
function coverImg(cover: string, widths: number[], sizes: string, extra = ''): string {
  const srcset = imageSrcset(cover, widths);
  const src = imageUrl(cover, widths[Math.min(1, widths.length - 1)]);
  return `<img src="${escapeHtml(src)}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${sizes}"` : ''} alt=""${extra}>`;
}

function ogImageUrl(cover: string): string {
  const abs = cover.startsWith('http') ? cover : `${SITE}${cover}`;
  return `${SITE}/.netlify/images?url=${encodeURIComponent(abs)}&w=1200&h=630&fit=cover&fm=jpg&q=80`;
}

function jsonLdScript(items: object[]): string {
  return items
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/<\//g, '<\\/')}</script>`)
    .join('\n');
}

interface LayoutOpts extends PageOpts {
  title: string;
  description: string;
  /** Path of the page in Catalan form ("/blog/x/"); the language prefix is added from `lang`. */
  path: string;
  ogImage: string;
  bodyClass: string;
  bodyHtml: string;
  jsonLd?: object[];
  activeNav?: '/' | '/blog' | '/destinacions' | '/about';
  noindex?: boolean;
}

function renderLayout(opts: LayoutOpts): string {
  const { lang } = opts;
  const canonical = `${SITE}${lp(opts.canonicalLang ?? lang, opts.path)}`;
  const alternates = opts.langs.length > 1
    ? opts.langs.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${lp(l, opts.path)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE}${lp('ca', opts.path)}">`
    : '';
  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/favicon.ico">
<link rel="sitemap" href="/sitemap.xml">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)}" href="${SITE}/rss.xml">
<link rel="canonical" href="${canonical}">
${alternates}
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(decodeHtmlEntities(opts.description))}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${escapeHtml(decodeHtmlEntities(opts.description))}">
<meta property="og:image" content="${opts.ogImage}">
<meta name="twitter:card" content="summary_large_image">
${opts.noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
<link rel="preload" href="/fonts/cinzel-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="stylesheet" href="/styles.css">
${opts.jsonLd ? jsonLdScript(opts.jsonLd) : ''}
</head>
<body class="${opts.bodyClass}">
<div class="watermark" aria-hidden="true"><img src="/favicon.svg" alt=""></div>
${renderHeader(opts)}
${opts.notice ? `<p class="lang-notice" role="status">${escapeHtml(opts.notice)}</p>` : ''}
${opts.bodyHtml}
${renderFooter(lang)}
</body>
</html>`;
}

function renderHeader(opts: LayoutOpts): string {
  const { lang, activeNav: active } = opts;
  const link = (href: string, label: string) => `<a href="${lp(lang, href)}"${active === href ? ' class="active"' : ''}>${label}</a>`;
  const switcher = opts.langs.length > 1
    ? `<div class="lang-switch" role="group" aria-label="${t(lang, 'lang.aria')}">${opts.langs
        .map((l) => (l === lang ? `<span class="current" lang="${l}" aria-current="true" title="${LANG_NAME[l]}">${LANG_LABEL[l]}</span>` : `<a href="${lp(l, opts.path)}" lang="${l}" hreflang="${l}" title="${LANG_NAME[l]}">${LANG_LABEL[l]}</a>`))
        .join('<span class="sep" aria-hidden="true">·</span>')}</div>`
    : '';
  return `<header class="site-header">
  <div class="header-inner">
    <a href="${lp(lang, '/')}" class="brand"><img src="/favicon.svg" alt="" width="28" height="28"><span>${escapeHtml(SITE_NAME)}</span></a>
    <nav aria-label="${t(lang, 'nav.aria')}">
      ${link('/', t(lang, 'nav.home'))}
      ${link('/blog', t(lang, 'nav.posts'))}
      ${link('/destinacions', t(lang, 'nav.destinations'))}
      ${link('/about', t(lang, 'nav.about'))}
    </nav>
    ${switcher}
  </div>
  <svg class="header-chain" viewBox="0 0 400 16" aria-hidden="true" focusable="false">
    <line x1="0" y1="8" x2="400" y2="8" stroke="#8a8677" stroke-width="1"/>
    ${[20, 96, 172, 228, 304, 380].map((cx) => `<circle cx="${cx}" cy="8" r="7" fill="none" stroke="#445d4e" stroke-width="1.5"/>`).join('')}
  </svg>
</header>`;
}

function renderFooter(lang: Lang): string {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <img src="/favicon.svg" alt="" width="26" height="26" style="opacity:.85">
  <p>© ${year} ${escapeHtml(SITE_NAME)}. ${t(lang, 'footer.tagline')}</p>
  <div class="footer-links">
    <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(INSTAGRAM_HANDLE)}</a>
    <a href="/rss.xml">RSS</a>
    ${newsletterEnabled() ? `<a href="${lp(lang, '/newsletter/')}">${t(lang, 'footer.newsletter')}</a>` : ''}
    <a href="${lp(lang, '/privacitat/')}">${t(lang, 'footer.privacy')}</a>
    <a href="mailto:${CONTACT_EMAIL}">${t(lang, 'footer.contact')}</a>
    <a href="/panel">${t(lang, 'footer.panel')}</a>
  </div>
</footer>`;
}

/** "cap-de-setmana" → "cap de setmana" (Catalan display name of a category). */
export function categoryLabel(category: string): string {
  return category.replace(/-/g, ' ');
}

export function categoryPath(category: string): string {
  return `/categoria/${encodeURIComponent(category)}/`;
}

function tagsHtml(categories: string[], lang: Lang): string {
  if (!categories?.length) return '';
  return `<div class="tags">${categories
    .map((c) => `<a class="tag" href="${lp(lang, categoryPath(c))}">${escapeHtml(categoryName(lang, c))}</a>`)
    .join('')}</div>`;
}

function metaRow(date: string, updated: string, lang: Lang, location?: string, reading?: number): string {
  const parts = [`<time datetime="${date}">${formatDateLang(date, lang)}</time>`];
  if (location) parts.push(`<span class="location">${escapeHtml(location)}</span>`);
  if (reading) parts.push(`<span class="reading">${t(lang, 'meta.reading', { n: reading })}</span>`);
  if (updated && updated.slice(0, 10) !== date.slice(0, 10)) {
    parts.push(`<em>${t(lang, 'meta.updated', { d: formatDateLang(updated, lang) })}</em>`);
  }
  return `<div class="meta">${parts.join('')}</div>`;
}

interface ArticleLike {
  title: string;
  lead: string;
  blocks: Block[];
  cover: string;
  categories?: string[];
  location?: string;
  date: string;
  updated: string;
  refs?: string[];
}

interface NavLink {
  slug: string;
  title: string;
}

export interface AdjacentPosts {
  /** Next-older published post (or the previous part of a series). */
  prev?: NavLink;
  /** Next-newer published post (or the next part of a series). */
  next?: NavLink;
  /** The links walk through the parts of a series rather than through all the relats. */
  inSeries?: boolean;
}

export interface SeriesItem {
  slug: string;
  label: string;
  order: number;
  reading: number;
  current: boolean;
}

export interface SeriesBox {
  /** Name shown (translated); the URL uses `slug`. */
  name: string;
  slug: string;
  items: SeriesItem[];
}

interface ArticleExtras {
  places?: Place[];
  series?: SeriesBox;
  newsletter?: boolean;
  toc?: boolean;
  info?: PostInfo;
  reading?: number;
  adjacent?: AdjacentPosts;
}

const INFO_KEYS: Array<[keyof PostInfo, UiKey]> = [
  ['days', 'info.days'],
  ['season', 'info.season'],
  ['budget', 'info.budget'],
  ['transport', 'info.transport'],
];

function infoHtml(lang: Lang, info?: PostInfo): string {
  const rows = INFO_KEYS.filter(([key]) => info?.[key]).map(
    ([key, label]) => `<div><dt>${t(lang, label)}</dt><dd>${escapeHtml(info![key]!)}</dd></div>`,
  );
  if (!rows.length) return '';
  return `<aside class="trip-info" aria-label="${t(lang, 'info.title')}"><h2>${t(lang, 'info.title')}</h2><dl>${rows.join('')}</dl></aside>`;
}

const ROUTE_MAX_ASPECT = 1.8;
const ROUTE_MIN_ASPECT = 1.25;

/** Pushes points apart, in place, until none is closer than `minSep` to another. */
function spreadPins(pts: { x: number; y: number }[], minSep: number): void {
  for (let round = 0; round < 40; round++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        let dx = pts[j].x - pts[i].x;
        let dy = pts[j].y - pts[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= minSep) continue;
        if (d < 1e-6) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const push = (minSep - d) / 2 + 0.01;
        pts[i].x -= (dx / d) * push;
        pts[i].y -= (dy / d) * push;
        pts[j].x += (dx / d) * push;
        pts[j].y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) return;
  }
}

/** Static route map at the top of a relat: the places visited as numbered pins joined, in order, by
 *  a dashed line. When every place is inside a city we have a street map of (see citymap.mts) that
 *  map is used, zoomed on the route; otherwise the world map. Hidden when fewer than two places have
 *  a position, or when they are so close together that the pins couldn't be told apart at this
 *  scale (a single city on the world map, say). The place names are the same in every language. */
function routeMapHtml(lang: Lang, places?: Place[]): string {
  const located = (places ?? []).filter((p): p is Place & { lat: number; lon: number } => typeof p.lat === 'number' && typeof p.lon === 'number');
  if (located.length < 2) return '';
  const city = cityMapFor(located);
  const pts = located.map((p) => (city ? projectCity(city, p.lat, p.lon) : projectLatLon(p.lat, p.lon)));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  if (spanX + spanY < (city ? 20 : 1.0)) return '';

  // Wide trips get a wide map; tall ones (a country from north to south) a squarer one, so the pins
  // stay apart on a phone.
  const aspect = Math.min(ROUTE_MAX_ASPECT, Math.max(ROUTE_MIN_ASPECT, spanX / Math.max(spanY, 0.001)));
  const mapW = city ? city.w : MAP_W;
  const mapH = city ? cityHeight(city) : MAP_H;
  const v = mapView(pts, aspect, city ? 120 : 12, mapW, mapH);
  // On a city map, places a few hundred metres apart would pile up on a phone: nudge them apart,
  // assuming the map is drawn about 300 px wide, so every number stays legible (the shift is tiny
  // compared with the area shown).
  if (city) spreadPins(pts, (19 * v.w) / 300);
  const line = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const art = `<svg class="route-art" viewBox="${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><image href="${city ? city.file : '/mapa-mon.svg'}" x="0" y="0" width="${mapW}" height="${mapH}"/><polyline points="${line}" fill="none" stroke="#a07c33" stroke-width="2.5" stroke-dasharray="7 5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  const pins = pts
    .map((p, i) => `<span class="route-pin" style="left:${(((p.x - v.x) / v.w) * 100).toFixed(2)}%;top:${(((p.y - v.y) / v.h) * 100).toFixed(2)}%" aria-hidden="true">${i + 1}</span>`)
    .join('');
  const items = located.map((p) => `<li>${escapeHtml(p.name)}</li>`).join('');
  const note = t(lang, 'map.note') + (city ? ` ${city.credit}.` : '');
  return `<figure class="route-map-wrap"><div class="route-map${city ? ' route-map-city' : ''}" role="img" aria-label="${t(lang, 'map.aria')}" style="--ar:${aspect.toFixed(2)}">${art}${pins}</div><ol class="route-list">${items}</ol><figcaption>${note}</figcaption></figure>`;
}

function seriesBoxHtml(lang: Lang, series?: SeriesBox): string {
  if (!series || series.items.length < 2) return '';
  const parts = series.items.filter((i) => i.order > 0).length;
  const rows = series.items
    .map((i) => {
      const num = i.order > 0 ? String(i.order) : '·';
      const text = i.order > 0 ? escapeHtml(i.label) : t(lang, 'series.start', { x: escapeHtml(i.label) });
      const tail = i.current ? `<em>${t(lang, 'series.here')}</em>` : `<em>${t(lang, 'series.min', { n: i.reading })}</em>`;
      return i.current
        ? `<li class="cur"><b>${num}</b><span>${text}</span>${tail}</li>`
        : `<li><b>${num}</b><a href="${lp(lang, `/blog/${i.slug}/`)}">${text}</a>${tail}</li>`;
    })
    .join('');
  return `<aside class="series-box" aria-label="${t(lang, 'series.aria')}"><div class="k">${t(lang, 'series.label', { n: parts, parts: t(lang, parts === 1 ? 'series.part' : 'series.parts') })}</div><div class="t"><a href="${lp(lang, `/serie/${series.slug}/`)}">${escapeHtml(series.name)}</a></div><ol>${rows}</ol></aside>`;
}

function postNavHtml(lang: Lang, adjacent?: AdjacentPosts): string {
  if (!adjacent?.prev && !adjacent?.next) return '';
  const link = (cls: string, label: string, l?: NavLink) =>
    l ? `<a class="${cls}" href="${lp(lang, `/blog/${l.slug}/`)}"><span>${label}</span><strong>${escapeHtml(l.title)}</strong></a>` : '';
  const prevLabel = t(lang, adjacent.inSeries ? 'series.prev' : 'post.prev');
  const nextLabel = t(lang, adjacent.inSeries ? 'series.next' : 'post.next');
  return `<nav class="post-nav" aria-label="${t(lang, 'post.nav')}">${link('prev', prevLabel, adjacent.prev)}${link('next', nextLabel, adjacent.next)}</nav>`;
}

function refsHtml(refs?: string[]): string {
  if (!refs?.length) return '';
  return `<ol class="refs">${refs.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ol>`;
}

interface RatingProps {
  postId: string;
  summary: RatingSummary;
  /** null = hasn't voted; 0 = voted, value unknown (legacy); 1-5 = current vote. */
  myVote: number | null;
}

function renderRatingSection(lang: Lang, rating: RatingProps): string {
  const { postId, summary, myVote } = rating;
  const voted = myVote !== null;
  const legend = (['rating.l1', 'rating.l2', 'rating.l3', 'rating.l4', 'rating.l5'] as const).map((k) => t(lang, k));

  // Two aligned columns — stars (the vote control) on the left, legend text on the right — laid
  // out as a table so rows stay in sync even when a legend line wraps onto two lines. The stars
  // stay clickable after voting so the visitor can change their vote; their current one is marked.
  const rows = legend.map((text, i) => {
    const n = i + 1;
    const glyphs = '★'.repeat(n);
    const mine = myVote === n;
    const starHtml = `<button type="submit" name="stars" value="${n}" class="stars${mine ? ' mine' : ''}"${mine ? ' aria-pressed="true"' : ''} aria-label="${n} ${t(lang, n === 1 ? 'rating.star' : 'rating.stars')} — ${escapeHtml(text)}">${glyphs}</button>`;
    return `<tr${mine ? ' class="mine"' : ''}><td>${starHtml}</td><td>${escapeHtml(text)}</td></tr>`;
  }).join('');

  const legendHtml = `<form method="post" action="/api/rate/${encodeURIComponent(postId)}">
      <table class="rating-table"><tbody>${rows}</tbody></table>
    </form>`;

  const resultHtml =
    summary.total > 0
      ? `<p class="rating-result">
      <span class="stars-display" aria-hidden="true">${'★'.repeat(Math.round(summary.avg))}${'☆'.repeat(5 - Math.round(summary.avg))}</span>
      <strong>${summary.avg.toFixed(1)}/5</strong> · ${summary.total} ${t(lang, summary.total === 1 ? 'rating.vote' : 'rating.votes')}
    </p>`
      : '';

  return `<section class="rating">
    <h3>${t(lang, 'rating.title')}</h3>
    ${legendHtml}
    ${resultHtml}
    ${voted ? `<p class="rating-thanks">${t(lang, 'rating.thanks')}</p>` : ''}
  </section>`;
}

function renderArticleBody(a: ArticleLike, lang: Lang, rating?: RatingProps, extras: ArticleExtras = {}): string {
  return `<main class="page-article">
<article>
  ${a.cover ? `<div class="hero-image">${coverImg(a.cover, [800, 1200, 1600], '100vw', ' fetchpriority="high"')}</div>` : ''}
  <div class="prose">
    <div class="title">
      ${metaRow(a.date, a.updated, lang, a.location, extras.reading)}
      ${tagsHtml(a.categories ?? [], lang)}
      <h1>${escapeHtml(a.title)}</h1>
    </div>
    <hr>
    <p>${a.lead}</p>
    ${routeMapHtml(lang, extras.places)}
    ${seriesBoxHtml(lang, extras.series)}
    ${infoHtml(lang, extras.info)}
    ${extras.toc ? renderToc(a.blocks, lang) : ''}
    ${renderBlocks(a.blocks, lang)}
    ${refsHtml(a.refs)}
    <div class="ornament-rombo" aria-hidden="true">◆</div>
    ${rating ? renderRatingSection(lang, rating) : ''}
    ${extras.newsletter ? renderSubscribeForm(lang) : ''}
    ${postNavHtml(lang, extras.adjacent)}
  </div>
</article>
</main>`;
}

// A few posts carry their own decorative treatment (photo frame, page background), scoped by
// slug rather than applied site-wide — each one is a deliberate one-off, not a general feature.
const ARTICLE_THEME_BY_SLUG: Record<string, string> = {
  'roma-la-citta-eterna': 'page-roma',
  'copenhagen-la-ciutat-de-les-mil-punxes': 'page-copenhagen',
  'motxilla-viatjar-lleuger': 'page-motxilla',
  'irlanda-l-illa-maragda': 'page-irlanda',
  'berlin-l-atenes-de-l-spree': 'page-berlin',
  'dresden-la-florencia-de-l-elba': 'page-dresden',
  'marraqueix-i-merzouga-dormir-sota-els-estels': 'page-marroc',
  'la-ruta-del-tren-petit-un-petit-tast-celestial-del-baix-emporda': 'page-emporda',
};

// The same treatment applies to every part of a series, keyed by the series' slug.
const SERIES_THEME: Record<string, string> = {
  'irlanda-l-illa-maragda': 'page-irlanda',
};

/** `post` is already the version to show (see localizePost); `post.slug` and `post.series` stay the
 *  Catalan keys behind the URLs, and `seriesName` (in `series`) is the name to display. */
export function renderArticle(post: Post, rating?: RatingProps, adjacent?: AdjacentPosts, newsletter = false, series?: SeriesBox, o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const path = `/blog/${post.slug}/`;
  const theme = (post.slug ? ARTICLE_THEME_BY_SLUG[post.slug] : undefined) ?? (post.series ? SERIES_THEME[seriesSlug(post.series)] : undefined);
  const bodyClass = theme ? `page-article ${theme}` : 'page-article';
  const canonical = `${SITE}${lp(o.canonicalLang ?? lang, path)}`;
  return renderLayout({
    ...o,
    title: `${post.title} — ${SITE_NAME}`,
    description: post.lead.replace(/<[^>]+>/g, '').slice(0, 200),
    path,
    ogImage: ogImageUrl(post.cover || '/images/hero-home.svg'),
    bodyClass,
    activeNav: '/blog',
    bodyHtml: renderArticleBody(
      {
        title: post.title,
        lead: post.lead,
        blocks: post.blocks,
        cover: post.cover,
        categories: post.categories,
        location: post.location,
        date: post.date,
        updated: post.updated,
        refs: post.refs,
      },
      lang,
      rating,
      { toc: true, info: post.info, reading: post.reading, adjacent, newsletter, series, places: post.places },
    ),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: decodeHtmlEntities(post.lead.replace(/<[^>]+>/g, '')),
        inLanguage: HTML_LANG[lang],
        datePublished: post.date,
        dateModified: post.updated,
        image: ogImageUrl(post.cover || '/images/hero-home.svg'),
        mainEntityOfPage: canonical,
        author: { '@type': 'Person', name: AUTHOR_NAME, jobTitle: t(lang, 'jobTitle') },
        ...(post.series ? { isPartOf: { '@type': 'CreativeWorkSeries', name: series?.name ?? post.series, url: `${SITE}${lp(lang, `/serie/${seriesSlug(post.series)}/`)}` } } : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t(lang, 'crumb.home'), item: `${SITE}${lp(lang, '/')}` },
          { '@type': 'ListItem', position: 2, name: t(lang, 'crumb.posts'), item: `${SITE}${lp(lang, '/blog/')}` },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
        ],
      },
    ],
  });
}

/** Renders a not-yet-saved/published post for the panel's "vista prèvia" — noindex, no JSON-LD,
 *  no dependency on a real slug (drafts don't have one yet). */
export function renderPreview(post: Pick<Post, 'title' | 'lead' | 'blocks' | 'cover' | 'categories' | 'location' | 'date' | 'updated' | 'refs' | 'info'> & Partial<Pick<Post, 'places' | 'series'>>): string {
  // Same visual treatment as the published page (the slug it would get, or its series).
  const theme = ARTICLE_THEME_BY_SLUG[slugify(post.title)] ?? (post.series ? SERIES_THEME[seriesSlug(post.series)] : undefined);
  return renderLayout({
    ...CA_ONLY,
    title: `${post.title || '(Sense títol)'} — ${SITE_NAME}`,
    description: (post.lead || '').replace(/<[^>]+>/g, '').slice(0, 200),
    path: '/',
    ogImage: ogImageUrl(post.cover || '/images/hero-home.svg'),
    bodyClass: theme ? `page-article page-preview ${theme}` : 'page-article page-preview',
    bodyHtml: renderArticleBody(post, 'ca', undefined, { toc: true, info: post.info, places: post.places }),
    noindex: true,
  });
}

export function renderAbout(o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const text = lang === 'es' ? { ...ABOUT_ES, blocks: ABOUT_BLOCKS_ES } : lang === 'en' ? { ...ABOUT_EN, blocks: ABOUT_BLOCKS_EN } : { title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, lead: ABOUT_LEAD, summary: ABOUT_SUMMARY, blocks: ABOUT_BLOCKS };
  return renderLayout({
    ...o,
    title: `${text.title} — ${SITE_NAME}`,
    description: text.description,
    path: '/about/',
    ogImage: ogImageUrl(ABOUT_COVER),
    bodyClass: 'page-article page-about',
    activeNav: '/about',
    bodyHtml: renderArticleBody({
      title: text.title,
      lead: text.lead,
      blocks: text.blocks,
      cover: ABOUT_COVER,
      date: new Date().toISOString(),
      updated: new Date().toISOString(),
    }, lang),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: AUTHOR_NAME,
        url: `${SITE}${lp(lang, '/about/')}`,
        jobTitle: t(lang, 'jobTitle'),
      },
    ],
  });
}

export function renderHome(latest: IndexEntry[], o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const summary = lang === 'es' ? ABOUT_ES.summary : lang === 'en' ? ABOUT_EN.summary : ABOUT_SUMMARY;
  const cards = latest
    .slice(0, 3)
    .map(
      (p) => `<li><a href="${lp(lang, `/blog/${p.slug}/`)}">
        ${coverImg(p.cover, [480, 800], '(max-width: 720px) 90vw, 330px', ' loading="lazy" decoding="async"')}
        <h4>${escapeHtml(p.title)}</h4>
        <p class="date">${formatDateLang(p.date, lang)}</p>
      </a></li>`,
    )
    .join('');

  const body = `<main class="page-home">
  <section class="hero">
    <svg class="hero-mark" viewBox="0 0 640 640" aria-hidden="true" focusable="false">
      <circle cx="320" cy="320" r="200" fill="none" stroke="#fbf3e7" stroke-width="2"/>
    </svg>
    <h1 class="wordmark"><span class="llum">Llum</span><span class="nomada">Nòmada</span></h1>
    <p class="tagline">${escapeHtml(t(lang, 'site.tagline'))}</p>
    <a class="btn btn-solid" href="${lp(lang, '/blog')}">${t(lang, 'home.cta')}</a>
  </section>
  <section class="about-blurb">
    <p>${escapeHtml(summary)}</p>
    <a class="see-all" href="${lp(lang, '/about')}">${t(lang, 'home.about')}</a>
  </section>
  <section class="latest">
    <h2>${t(lang, 'home.latest')}</h2>
    <ul>${cards}</ul>
    <a class="see-all" href="${lp(lang, '/blog')}">${t(lang, 'home.all')}</a>
  </section>
</main>`;

  return renderLayout({
    ...o,
    title: `${SITE_NAME} — ${t(lang, 'site.tagline')}`,
    description: t(lang, 'site.tagline'),
    path: '/',
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-home',
    activeNav: '/',
    bodyHtml: body,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: SITE_NAME,
        description: t(lang, 'site.tagline'),
        inLanguage: HTML_LANG[lang],
        url: `${SITE}${lp(lang, '/')}`,
      },
    ],
  });
}

function postCards(posts: IndexEntry[], featuredFirst: boolean, lang: Lang): string {
  return posts
    .map(
      (p, i) => `<li class="${featuredFirst && i === 0 ? 'featured' : ''}"><a href="${lp(lang, `/blog/${p.slug}/`)}">
        ${coverImg(p.cover, [480, 800], '(max-width: 720px) 90vw, 330px', ' loading="lazy" decoding="async"')}
        <h4 class="title">${escapeHtml(p.title)}</h4>
        <div class="meta"><time datetime="${p.date}">${formatDateLang(p.date, lang)}</time>${p.location ? `<span class="location">${escapeHtml(p.location)}</span>` : ''}</div>
      </a></li>`,
    )
    .join('');
}

/** Row of category links ("per tema"); `current` is highlighted on its own category page. */
function categoryChips(categories: string[], lang: Lang, current?: string): string {
  if (!categories.length) return '';
  return `<nav class="chips" aria-label="${t(lang, 'blog.chips')}">${categories
    .map((c) => `<a href="${lp(lang, categoryPath(c))}"${c === current ? ' class="current" aria-current="page"' : ''}>${escapeHtml(categoryName(lang, c))}</a>`)
    .join('')}</nav>`;
}

/** Categories used by at least one of the given posts, most-used first. */
export function usedCategories(posts: IndexEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const p of posts) for (const c of p.categories ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ca')).map(([c]) => c);
}

/** The full list of relats (`category` undefined) or the relats of one category. `all` is every
 *  published post, used to build the category chips. */
export function renderBlogIndex(posts: IndexEntry[], all: IndexEntry[] = posts, category?: string, o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const heading = category ? t(lang, 'blog.category', { c: categoryName(lang, category) }) : t(lang, 'blog.title');
  const path = category ? categoryPath(category) : '/blog/';
  const body = `<main class="page-blog-index">
  <h1>${escapeHtml(heading)}</h1>
  ${categoryChips(usedCategories(all), lang, category)}
  <ul>${postCards(posts, true, lang)}</ul>
</main>`;

  return renderLayout({
    ...o,
    title: `${heading} — ${SITE_NAME}`,
    description: category ? t(lang, 'blog.categoryDesc', { c: categoryName(lang, category), site: SITE_NAME }) : t(lang, 'site.tagline'),
    path,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-blog-index',
    activeNav: '/blog',
    bodyHtml: body,
  });
}

const MAP_ASPECT = 1.6;

/** Static world map (public/mapa-mon.svg as a background, zoomed with CSS to the area covered by
 *  the pins) with one link per relat that has coordinates. No JS: positions are percentages. */
function worldMap(posts: IndexEntry[], lang: Lang): string {
  const pins = posts
    .filter((p) => p.coords && p.slug)
    .map((p) => ({ post: p, pt: projectLatLon(p.coords!.lat, p.coords!.lon) }));
  if (!pins.length) return '';

  const v = mapView(pins.map((p) => p.pt), MAP_ASPECT);

  const links = pins
    .map(({ post, pt }) => {
      const left = ((pt.x - v.x) / v.w) * 100;
      const top = ((pt.y - v.y) / v.h) * 100;
      const label = (post.location || post.title).split(',')[0].trim();
      return `<a class="map-pin${left > 72 ? ' left' : ''}" href="${lp(lang, `/blog/${post.slug}/`)}" data-x="${pt.x.toFixed(2)}" data-y="${pt.y.toFixed(2)}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${escapeHtml(post.title)}"><span class="dot" aria-hidden="true"></span><span class="label">${escapeHtml(label)}</span></a>`;
    })
    .join('');

  // The drawing sits in an inline <svg> whose viewBox is exactly the visible window (same aspect
  // as the box), so pin percentages and the art can't drift apart.
  const art = `<svg class="map-art" viewBox="${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><image href="/mapa-mon.svg" x="0" y="0" width="${MAP_W}" height="${MAP_H}"/></svg>`;
  return `<div class="world-map" role="group" aria-label="${t(lang, 'dest.map')}" style="--ar:${MAP_ASPECT}">${art}${links}</div>
  <script src="/mapa.js" defer></script>`;
}

function countrySlug(country: string): string {
  return country
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Relats grouped by country (the `country` field), countries ordered by their newest relat. Posts
 *  without a country (general advice, etc.) simply don't appear here. The `country` of a post is
 *  kept in Catalan (it is the grouping key); its name is translated only for display. */
export function renderDestinations(all: IndexEntry[], o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const groups = new Map<string, IndexEntry[]>();
  for (const p of all) {
    const country = (p.country ?? '').trim();
    if (!country) continue;
    groups.set(country, [...(groups.get(country) ?? []), p]);
  }
  const countries = [...groups.keys()];

  const sections = countries
    .map(
      (c) => `<section class="destination" id="${countrySlug(c)}">
    <h2>${escapeHtml(countryName(lang, c))} <span>${groups.get(c)!.length} ${t(lang, groups.get(c)!.length === 1 ? 'dest.one' : 'dest.many')}</span></h2>
    <ul>${postCards(groups.get(c)!, false, lang)}</ul>
  </section>`,
    )
    .join('\n  ');

  const nav = countries.length > 1
    ? `<nav class="chips" aria-label="${t(lang, 'dest.jump')}">${countries.map((c) => `<a href="#${countrySlug(c)}">${escapeHtml(countryName(lang, c))}</a>`).join('')}</nav>`
    : '';

  const chips = categoryChips(usedCategories(all), lang);
  const body = `<main class="page-blog-index page-destinations">
  <h1>${t(lang, 'dest.title')}</h1>
  <p class="intro">${t(lang, 'dest.intro')}</p>
  ${worldMap(all, lang)}
  ${nav}
  ${sections || `<p class="intro">${t(lang, 'dest.empty')}</p>`}
  ${chips ? `<h2 class="by-theme">${t(lang, 'dest.byTheme')}</h2>${chips}` : ''}
</main>`;

  return renderLayout({
    ...o,
    title: `${t(lang, 'dest.title')} — ${SITE_NAME}`,
    description: t(lang, 'dest.desc', { site: SITE_NAME }),
    path: '/destinacions/',
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-blog-index',
    activeNav: '/destinacions',
    bodyHtml: body,
  });
}

/** E-mail sign-up box. Plain HTML form → /api/newsletter/subscribe (no JS). The hidden "website"
 *  field is a honeypot for bots; real visitors never see or fill it. The hidden "lang" field makes
 *  the confirmation pages come back in the visitor's language. */
function renderSubscribeForm(lang: Lang): string {
  return `<section class="subscribe" aria-labelledby="subscribe-title">
    <h3 id="subscribe-title">${t(lang, 'nl.formTitle')}</h3>
    <p>${t(lang, 'nl.formText')}</p>
    <form method="post" action="/api/newsletter/subscribe">
      <div class="subscribe-row">
        <input type="email" name="email" required autocomplete="email" placeholder="${t(lang, 'nl.placeholder')}" aria-label="${t(lang, 'nl.email')}" maxlength="254">
        <button type="submit">${t(lang, 'nl.button')}</button>
      </div>
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <input type="hidden" name="lang" value="${lang}">
      <label class="consent"><input type="checkbox" name="consent" value="1" required> ${t(lang, 'nl.consent', { site: escapeHtml(SITE_NAME), url: lp(lang, '/privacitat/') })}</label>
    </form>
  </section>`;
}

const NEWSLETTER_PAGES: Record<string, { title: UiKey; text: UiKey }> = {
  revisa: { title: 'nl.checkTitle', text: 'nl.checkText' },
  confirmat: { title: 'nl.confirmedTitle', text: 'nl.confirmedText' },
  'baixa-feta': { title: 'nl.goneTitle', text: 'nl.goneText' },
  error: { title: 'nl.errorTitle', text: 'nl.errorText' },
  'no-disponible': { title: 'nl.offTitle', text: 'nl.offText' },
};

export function isNewsletterPage(kind: string): boolean {
  return kind === '' || kind === 'baixa' || kind in NEWSLETTER_PAGES;
}

/** Small standalone pages of the newsletter flow. `kind` '' is the sign-up page; 'baixa' shows the
 *  unsubscribe confirmation button for the given id/token. */
export function renderNewsletterPage(kind: string, params: { id?: string; t?: string } = {}, o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const page = (k: string) => ({ title: t(lang, NEWSLETTER_PAGES[k].title), text: t(lang, NEWSLETTER_PAGES[k].text) });
  let inner: string;
  let title: string;
  if (kind === '') {
    title = t(lang, 'nl.title');
    inner = newsletterEnabled()
      ? `<h1>${t(lang, 'nl.title')}</h1>${renderSubscribeForm(lang)}`
      : `<h1>${page('no-disponible').title}</h1><p>${page('no-disponible').text}</p>`;
  } else if (kind === 'baixa') {
    title = t(lang, 'nl.unsubPage');
    const valid = /^[a-f0-9]{24}$/.test(params.id ?? '') && /^[a-f0-9]{16,128}$/.test(params.t ?? '');
    inner = valid
      ? `<h1>${t(lang, 'nl.unsubTitle')}</h1><p>${t(lang, 'nl.unsubText')}</p>
    <form method="post" action="/api/newsletter/unsubscribe">
      <input type="hidden" name="id" value="${params.id}"><input type="hidden" name="t" value="${params.t}"><input type="hidden" name="lang" value="${lang}">
      <button type="submit" class="btn btn-solid">${t(lang, 'nl.unsubButton')}</button>
    </form>`
      : `<h1>${page('error').title}</h1><p>${page('error').text}</p>`;
  } else {
    if (!NEWSLETTER_PAGES[kind]) return render404(o);
    const p = page(kind);
    title = p.title;
    inner = `<h1>${p.title}</h1><p>${p.text}</p><p><a href="${lp(lang, '/blog')}">${t(lang, 'nl.back')}</a></p>`;
  }
  return renderLayout({
    ...o,
    title: `${title} — ${SITE_NAME}`,
    description: t(lang, 'site.tagline'),
    path: '/newsletter/',
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-newsletter',
    bodyHtml: `<main class="page-newsletter">${inner}</main>`,
    noindex: true,
  });
}

/** Privacy policy. A draft written for this blog's actual data handling — worth a read by the author. */
export function renderPrivacy(o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const name = escapeHtml(AUTHOR_LEGAL_NAME);
  const site = escapeHtml(SITE_NAME);
  const owner = AUTHOR_LEGAL_NAME
    ? lang === 'es' ? `${name}, titular de ${site}` : lang === 'en' ? `${name}, owner of ${site}` : `${name}, titular de ${site}`
    : `${site} (${escapeHtml(AUTHOR_NAME)})`;
  const body = `<main class="page-article page-legal">
<article><div class="prose">
  <div class="title"><h1>${t(lang, 'privacy.title')}</h1></div>
  <hr>
  ${privacyBody(lang, owner, CONTACT_EMAIL)}
</div></article>
</main>`;
  return renderLayout({
    ...o,
    title: `${t(lang, 'privacy.title')} — ${SITE_NAME}`,
    description: t(lang, 'privacy.desc', { site: SITE_NAME }),
    path: '/privacitat/',
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-article page-legal',
    bodyHtml: body,
  });
}

export function render404(o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const body = `<main class="page-404">
  <h1>${t(lang, 'notfound.title')}</h1>
  <p>${t(lang, 'notfound.text')} <a href="${lp(lang, '/')}">${t(lang, 'notfound.home')}</a>.</p>
</main>`;
  return renderLayout({
    ...o,
    langs: [lang],
    title: `${t(lang, 'notfound.title')} — ${SITE_NAME}`,
    description: t(lang, 'notfound.title'),
    path: '/404/',
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-404',
    bodyHtml: body,
  });
}

export function renderRss(posts: IndexEntry[]): string {
  const items = posts
    .map(
      (p) => `<item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE}/blog/${p.slug}/</link>
      <guid>${SITE}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeHtml(p.title)}</description>
    </item>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${escapeHtml(SITE_NAME)}</title>
<description>${escapeHtml(t('ca', 'site.tagline'))}</description>
<link>${SITE}/</link>
${items}
</channel></rss>`;
}

/** Landing page of a series: its overview post (order 0) and the numbered parts as cards. `members`
 *  are already localized entries; `seriesName` (when present) is the name to display. */
export function renderSeriesPage(members: Array<IndexEntry & { seriesName?: string }>, o: PageOpts = CA_ONLY): string {
  const { lang } = o;
  const catalanName = members[0].series ?? '';
  const name = members[0].seriesName ?? catalanName;
  const slug = seriesSlug(catalanName);
  const overview = members.find((m) => (m.seriesOrder ?? 0) === 0);
  const parts = members.filter((m) => (m.seriesOrder ?? 0) > 0);
  const cards = parts
    .map(
      (p) => `<li><a href="${lp(lang, `/blog/${p.slug}/`)}">
        ${coverImg(p.cover, [480, 800], '(max-width: 720px) 90vw, 330px', ' loading="lazy" decoding="async"')}
        <h4 class="title">${p.seriesOrder} · ${escapeHtml(p.seriesLabel || p.title)}</h4>
        <div class="meta"><span>${t(lang, 'meta.reading', { n: p.reading })}</span></div>
      </a></li>`,
    )
    .join('');
  const intro = overview ? `<p class="intro">${overview.lead}</p>` : '';
  const start = overview
    ? `<div class="series-start"><span>${t(lang, 'series.toStart')}</span> <a href="${lp(lang, `/blog/${overview.slug}/`)}">${escapeHtml(overview.seriesLabel || overview.title)} →</a></div>`
    : '';
  const body = `<main class="page-blog-index page-series">
  <h1>${escapeHtml(name)}</h1>
  ${intro}
  ${start}
  <ul>${cards}</ul>
</main>`;
  return renderLayout({
    ...o,
    title: `${name} — ${SITE_NAME}`,
    description: t(lang, 'series.desc', { name, site: SITE_NAME }),
    path: `/serie/${slug}/`,
    ogImage: ogImageUrl((overview ?? parts[0])?.cover || '/images/hero-home.svg'),
    bodyClass: 'page-blog-index page-series',
    activeNav: '/blog',
    bodyHtml: body,
  });
}

/** Every public URL, once per language it exists in, each with its alternates (xhtml:link). */
export function renderSitemap(posts: IndexEntry[], enabled: Lang[] = ['ca']): string {
  type Page = { path: string; langs: Lang[] };
  const pages: Page[] = ['/', '/blog/', '/destinacions/', '/about/', '/privacitat/'].map((path) => ({ path, langs: enabled }));
  for (const p of posts) pages.push({ path: `/blog/${p.slug}/`, langs: entryLangs(p, false).filter((l) => enabled.includes(l)) });
  for (const c of usedCategories(posts)) pages.push({ path: categoryPath(c), langs: enabled });
  const seriesNames = [...new Set(posts.filter((p) => p.series).map((p) => seriesSlug(p.series as string)))];
  for (const sl of seriesNames) pages.push({ path: `/serie/${sl}/`, langs: enabled });
  const urls = pages.flatMap((pg) =>
    pg.langs.map((l) => {
      const alts = pg.langs.length > 1 ? pg.langs.map((a) => `<xhtml:link rel="alternate" hreflang="${a}" href="${SITE}${lp(a, pg.path)}"/>`).join('') : '';
      return `<url><loc>${SITE}${lp(l, pg.path)}</loc>${alts}</url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}
