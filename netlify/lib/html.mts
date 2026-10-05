import type { Block, IndexEntry, Post, PostInfo } from './types.mts';
import { SITE, SITE_NAME, TAGLINE, AUTHOR_NAME, AUTHOR_LEGAL_NAME, CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from './config.mts';
import { decodeHtmlEntities, escapeHtml } from './sanitize.mts';
import { renderBlocks, renderToc } from './blocks.mts';
import { ABOUT_BLOCKS, ABOUT_COVER, ABOUT_DESCRIPTION, ABOUT_LEAD, ABOUT_SUMMARY, ABOUT_TITLE } from '../seed/about.mts';
import { RATING_LEGEND, type RatingSummary } from './ratings.mts';
import { imageSrcset, imageUrl } from './images.mts';
import { MAP_H, MAP_W, mapView, projectLatLon } from './worldmap.mts';
import { newsletterEnabled } from './newsletter-config.mts';

// Responsive WebP copies of an uploaded cover image (see images.mts); static SVGs pass through.
function coverImg(cover: string, widths: number[], sizes: string, extra = ''): string {
  const srcset = imageSrcset(cover, widths);
  const src = imageUrl(cover, widths[Math.min(1, widths.length - 1)]);
  return `<img src="${escapeHtml(src)}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${sizes}"` : ''} alt=""${extra}>`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ca-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
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

interface LayoutOpts {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  bodyClass: string;
  bodyHtml: string;
  jsonLd?: object[];
  activeNav?: '/' | '/blog' | '/destinacions' | '/about';
}

function renderLayout(opts: LayoutOpts): string {
  return `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/favicon.ico">
<link rel="sitemap" href="/sitemap.xml">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)}" href="${SITE}/rss.xml">
<link rel="canonical" href="${opts.canonical}">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(decodeHtmlEntities(opts.description))}">
<meta property="og:type" content="website">
<meta property="og:url" content="${opts.canonical}">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${escapeHtml(decodeHtmlEntities(opts.description))}">
<meta property="og:image" content="${opts.ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/cinzel-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="stylesheet" href="/styles.css">
${opts.jsonLd ? jsonLdScript(opts.jsonLd) : ''}
</head>
<body class="${opts.bodyClass}">
<div class="watermark" aria-hidden="true"><img src="/favicon.svg" alt=""></div>
${renderHeader(opts.activeNav)}
${opts.bodyHtml}
${renderFooter()}
</body>
</html>`;
}

function renderHeader(active?: string): string {
  const link = (href: string, label: string) => `<a href="${href}"${active === href ? ' class="active"' : ''}>${label}</a>`;
  return `<header class="site-header">
  <div class="header-inner">
    <a href="/" class="brand"><img src="/favicon.svg" alt="" width="28" height="28"><span>${escapeHtml(SITE_NAME)}</span></a>
    <nav aria-label="Navegació principal">
      ${link('/', 'Inici')}
      ${link('/blog', 'Relats')}
      ${link('/destinacions', 'Destinacions')}
      ${link('/about', 'Sobre mí')}
    </nav>
  </div>
  <svg class="header-chain" viewBox="0 0 400 16" aria-hidden="true" focusable="false">
    <line x1="0" y1="8" x2="400" y2="8" stroke="#8a8677" stroke-width="1"/>
    ${[20, 96, 172, 228, 304, 380].map((cx) => `<circle cx="${cx}" cy="8" r="7" fill="none" stroke="#445d4e" stroke-width="1.5"/>`).join('')}
  </svg>
</header>`;
}

function renderFooter(): string {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <img src="/favicon.svg" alt="" width="26" height="26" style="opacity:.85">
  <p>© ${year} ${escapeHtml(SITE_NAME)}. Explicant el món, un lloc a la vegada.</p>
  <div class="footer-links">
    <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(INSTAGRAM_HANDLE)}</a>
    <a href="/rss.xml">RSS</a>
    ${newsletterEnabled() ? '<a href="/newsletter/">Newsletter</a>' : ''}
    <a href="/privacitat/">Privacitat</a>
    <a href="mailto:${CONTACT_EMAIL}">Contacte</a>
    <a href="/panel">Panell</a>
  </div>
</footer>`;
}

/** "cap-de-setmana" → "cap de setmana" */
export function categoryLabel(category: string): string {
  return category.replace(/-/g, ' ');
}

export function categoryPath(category: string): string {
  return `/categoria/${encodeURIComponent(category)}/`;
}

function tagsHtml(categories: string[]): string {
  if (!categories?.length) return '';
  return `<div class="tags">${categories
    .map((c) => `<a class="tag" href="${categoryPath(c)}">${escapeHtml(categoryLabel(c))}</a>`)
    .join('')}</div>`;
}

function metaRow(date: string, updated: string, location?: string, reading?: number): string {
  const parts = [`<time datetime="${date}">${formatDate(date)}</time>`];
  if (location) parts.push(`<span class="location">${escapeHtml(location)}</span>`);
  if (reading) parts.push(`<span class="reading">${reading} min de lectura</span>`);
  if (updated && updated.slice(0, 10) !== date.slice(0, 10)) {
    parts.push(`<em>Actualitzat el ${formatDate(updated)}</em>`);
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
  /** Next-older published post. */
  prev?: NavLink;
  /** Next-newer published post. */
  next?: NavLink;
}

interface ArticleExtras {
  newsletter?: boolean;
  toc?: boolean;
  info?: PostInfo;
  reading?: number;
  adjacent?: AdjacentPosts;
}

const INFO_LABELS: Array<[keyof PostInfo, string]> = [
  ['days', 'Durada'],
  ['season', 'Època'],
  ['budget', 'Pressupost'],
  ['transport', 'Com moure’s'],
];

function infoHtml(info?: PostInfo): string {
  const rows = INFO_LABELS.filter(([key]) => info?.[key]).map(
    ([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(info![key]!)}</dd></div>`,
  );
  if (!rows.length) return '';
  return `<aside class="trip-info" aria-label="Fitxa pràctica"><h2>Fitxa pràctica</h2><dl>${rows.join('')}</dl></aside>`;
}

function postNavHtml(adjacent?: AdjacentPosts): string {
  if (!adjacent?.prev && !adjacent?.next) return '';
  const link = (cls: string, label: string, l?: NavLink) =>
    l ? `<a class="${cls}" href="/blog/${l.slug}/"><span>${label}</span><strong>${escapeHtml(l.title)}</strong></a>` : '';
  return `<nav class="post-nav" aria-label="Més relats">${link('prev', '← Relat anterior', adjacent.prev)}${link('next', 'Relat següent →', adjacent.next)}</nav>`;
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

function renderRatingSection(rating: RatingProps): string {
  const { postId, summary, myVote } = rating;
  const voted = myVote !== null;

  // Two aligned columns — stars (the vote control) on the left, legend text on the right — laid
  // out as a table so rows stay in sync even when a legend line wraps onto two lines. The stars
  // stay clickable after voting so the visitor can change their vote; their current one is marked.
  const rows = RATING_LEGEND.map((text, i) => {
    const n = i + 1;
    const glyphs = '★'.repeat(n);
    const mine = myVote === n;
    const starHtml = `<button type="submit" name="stars" value="${n}" class="stars${mine ? ' mine' : ''}"${mine ? ' aria-pressed="true"' : ''} aria-label="${n} ${n === 1 ? 'estrella' : 'estrelles'} — ${escapeHtml(text)}">${glyphs}</button>`;
    return `<tr${mine ? ' class="mine"' : ''}><td>${starHtml}</td><td>${escapeHtml(text)}</td></tr>`;
  }).join('');

  const legendHtml = `<form method="post" action="/api/rate/${encodeURIComponent(postId)}">
      <table class="rating-table"><tbody>${rows}</tbody></table>
    </form>`;

  const resultHtml =
    summary.total > 0
      ? `<p class="rating-result">
      <span class="stars-display" aria-hidden="true">${'★'.repeat(Math.round(summary.avg))}${'☆'.repeat(5 - Math.round(summary.avg))}</span>
      <strong>${summary.avg.toFixed(1)}/5</strong> · ${summary.total} ${summary.total === 1 ? 'vot' : 'vots'}
    </p>`
      : '';

  return `<section class="rating">
    <h3>Et fa ganes, aquest viatge?</h3>
    ${legendHtml}
    ${resultHtml}
    ${voted ? `<p class="rating-thanks">Gràcies pel teu vot! Si vols, pots tornar a triar una altra puntuació.</p>` : ''}
  </section>`;
}

function renderArticleBody(a: ArticleLike, rating?: RatingProps, extras: ArticleExtras = {}): string {
  return `<main class="page-article">
<article>
  ${a.cover ? `<div class="hero-image">${coverImg(a.cover, [800, 1200, 1600], '100vw', ' fetchpriority="high"')}</div>` : ''}
  <div class="prose">
    <div class="title">
      ${metaRow(a.date, a.updated, a.location, extras.reading)}
      ${tagsHtml(a.categories ?? [])}
      <h1>${escapeHtml(a.title)}</h1>
    </div>
    <hr>
    <p>${a.lead}</p>
    ${infoHtml(extras.info)}
    ${extras.toc ? renderToc(a.blocks) : ''}
    ${renderBlocks(a.blocks)}
    ${refsHtml(a.refs)}
    <div class="ornament-rombo" aria-hidden="true">◆</div>
    ${rating ? renderRatingSection(rating) : ''}
    ${extras.newsletter ? renderSubscribeForm() : ''}
    ${postNavHtml(extras.adjacent)}
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
};

export function renderArticle(post: Post, rating?: RatingProps, adjacent?: AdjacentPosts, newsletter = false): string {
  const canonical = `${SITE}/blog/${post.slug}/`;
  const theme = post.slug ? ARTICLE_THEME_BY_SLUG[post.slug] : undefined;
  const bodyClass = theme ? `page-article ${theme}` : 'page-article';
  return renderLayout({
    title: `${post.title} — ${SITE_NAME}`,
    description: post.lead.replace(/<[^>]+>/g, '').slice(0, 200),
    canonical,
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
      rating,
      { toc: true, info: post.info, reading: post.reading, adjacent, newsletter },
    ),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: decodeHtmlEntities(post.lead.replace(/<[^>]+>/g, '')),
        datePublished: post.date,
        dateModified: post.updated,
        image: ogImageUrl(post.cover || '/images/hero-home.svg'),
        mainEntityOfPage: canonical,
        author: { '@type': 'Person', name: AUTHOR_NAME, jobTitle: 'Autora de viatges' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inici', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Relats', item: `${SITE}/blog/` },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
        ],
      },
    ],
  });
}

/** Renders a not-yet-saved/published post for the panel's "vista prèvia" — noindex, no JSON-LD,
 *  no dependency on a real slug (drafts don't have one yet). */
export function renderPreview(post: Pick<Post, 'title' | 'lead' | 'blocks' | 'cover' | 'categories' | 'location' | 'date' | 'updated' | 'refs' | 'info'>): string {
  const layout = renderLayout({
    title: `${post.title || '(Sense títol)'} — ${SITE_NAME}`,
    description: (post.lead || '').replace(/<[^>]+>/g, '').slice(0, 200),
    canonical: `${SITE}/`,
    ogImage: ogImageUrl(post.cover || '/images/hero-home.svg'),
    bodyClass: 'page-article page-preview',
    bodyHtml: renderArticleBody(post, undefined, { toc: true, info: post.info }),
  });
  return layout.replace('<head>', '<head>\n<meta name="robots" content="noindex,nofollow">');
}

export function renderAbout(): string {
  const canonical = `${SITE}/about/`;
  return renderLayout({
    title: `${ABOUT_TITLE} — ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
    canonical,
    ogImage: ogImageUrl(ABOUT_COVER),
    bodyClass: 'page-article page-about',
    activeNav: '/about',
    bodyHtml: renderArticleBody({
      title: ABOUT_TITLE,
      lead: ABOUT_LEAD,
      blocks: ABOUT_BLOCKS,
      cover: ABOUT_COVER,
      date: new Date().toISOString(),
      updated: new Date().toISOString(),
    }),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: AUTHOR_NAME,
        url: `${SITE}/about/`,
        jobTitle: 'Autora de viatges',
      },
    ],
  });
}

export function renderHome(latest: IndexEntry[]): string {
  const cards = latest
    .slice(0, 3)
    .map(
      (p) => `<li><a href="/blog/${p.slug}/">
        ${coverImg(p.cover, [480, 800], '(max-width: 720px) 90vw, 330px', ' loading="lazy" decoding="async"')}
        <h4>${escapeHtml(p.title)}</h4>
        <p class="date">${formatDate(p.date)}</p>
      </a></li>`,
    )
    .join('');

  const body = `<main class="page-home">
  <section class="hero">
    <svg class="hero-mark" viewBox="0 0 640 640" aria-hidden="true" focusable="false">
      <circle cx="320" cy="320" r="200" fill="none" stroke="#fbf3e7" stroke-width="2"/>
    </svg>
    <h1 class="wordmark"><span class="llum">Llum</span><span class="nomada">Nòmada</span></h1>
    <p class="tagline">${escapeHtml(TAGLINE)}</p>
    <a class="btn btn-solid" href="/blog">Descobreix els relats</a>
  </section>
  <section class="about-blurb">
    <p>${escapeHtml(ABOUT_SUMMARY)}</p>
    <a class="see-all" href="/about">Sobre mí →</a>
  </section>
  <section class="latest">
    <h2>Darrers relats</h2>
    <ul>${cards}</ul>
    <a class="see-all" href="/blog">Veure tots els relats →</a>
  </section>
</main>`;

  return renderLayout({
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: TAGLINE,
    canonical: `${SITE}/`,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-home',
    activeNav: '/',
    bodyHtml: body,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: SITE_NAME,
        description: TAGLINE,
        url: `${SITE}/`,
      },
    ],
  });
}

function postCards(posts: IndexEntry[], featuredFirst: boolean): string {
  return posts
    .map(
      (p, i) => `<li class="${featuredFirst && i === 0 ? 'featured' : ''}"><a href="/blog/${p.slug}/">
        ${coverImg(p.cover, [480, 800], '(max-width: 720px) 90vw, 330px', ' loading="lazy" decoding="async"')}
        <h4 class="title">${escapeHtml(p.title)}</h4>
        <div class="meta"><time datetime="${p.date}">${formatDate(p.date)}</time>${p.location ? `<span class="location">${escapeHtml(p.location)}</span>` : ''}</div>
      </a></li>`,
    )
    .join('');
}

/** Row of category links ("per tema"); `current` is highlighted on its own category page. */
function categoryChips(categories: string[], current?: string): string {
  if (!categories.length) return '';
  return `<nav class="chips" aria-label="Relats per tema">${categories
    .map((c) => `<a href="${categoryPath(c)}"${c === current ? ' class="current" aria-current="page"' : ''}>${escapeHtml(categoryLabel(c))}</a>`)
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
export function renderBlogIndex(posts: IndexEntry[], all: IndexEntry[] = posts, category?: string): string {
  const heading = category ? `Relats: ${categoryLabel(category)}` : 'Relats';
  const canonical = category ? `${SITE}${categoryPath(category)}` : `${SITE}/blog/`;
  const body = `<main class="page-blog-index">
  <h1>${escapeHtml(heading)}</h1>
  ${categoryChips(usedCategories(all), category)}
  <ul>${postCards(posts, true)}</ul>
</main>`;

  return renderLayout({
    title: `${heading} — ${SITE_NAME}`,
    description: category ? `Tots els relats de la categoria «${categoryLabel(category)}» de ${SITE_NAME}.` : TAGLINE,
    canonical,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-blog-index',
    activeNav: '/blog',
    bodyHtml: body,
  });
}

const MAP_ASPECT = 1.6;

/** Static world map (public/mapa-mon.svg as a background, zoomed with CSS to the area covered by
 *  the pins) with one link per relat that has coordinates. No JS: positions are percentages. */
function worldMap(posts: IndexEntry[]): string {
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
      return `<a class="map-pin${left > 72 ? ' left' : ''}" href="/blog/${post.slug}/" data-x="${pt.x.toFixed(2)}" data-y="${pt.y.toFixed(2)}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${escapeHtml(post.title)}"><span class="dot" aria-hidden="true"></span><span class="label">${escapeHtml(label)}</span></a>`;
    })
    .join('');

  // The drawing sits in an inline <svg> whose viewBox is exactly the visible window (same aspect
  // as the box), so pin percentages and the art can't drift apart.
  const art = `<svg class="map-art" viewBox="${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><image href="/mapa-mon.svg" x="0" y="0" width="${MAP_W}" height="${MAP_H}"/></svg>`;
  return `<div class="world-map" role="group" aria-label="Mapa dels llocs visitats" style="--ar:${MAP_ASPECT}">${art}${links}</div>
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
 *  without a country (general advice, etc.) simply don't appear here. */
export function renderDestinations(all: IndexEntry[]): string {
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
    <h2>${escapeHtml(c)} <span>${groups.get(c)!.length} ${groups.get(c)!.length === 1 ? 'relat' : 'relats'}</span></h2>
    <ul>${postCards(groups.get(c)!, false)}</ul>
  </section>`,
    )
    .join('\n  ');

  const nav = countries.length > 1
    ? `<nav class="chips" aria-label="Salta a un país">${countries.map((c) => `<a href="#${countrySlug(c)}">${escapeHtml(c)}</a>`).join('')}</nav>`
    : '';

  const body = `<main class="page-blog-index page-destinations">
  <h1>Destinacions</h1>
  <p class="intro">Els llocs on he estat, país per país.</p>
  ${worldMap(all)}
  ${nav}
  ${sections || '<p class="intro">Aviat hi haurà aquí els primers destins.</p>'}
  ${categoryChips(usedCategories(all), undefined) ? `<h2 class="by-theme">Per tema</h2>${categoryChips(usedCategories(all))}` : ''}
</main>`;

  return renderLayout({
    title: `Destinacions — ${SITE_NAME}`,
    description: `Els relats de viatge de ${SITE_NAME} agrupats per país.`,
    canonical: `${SITE}/destinacions/`,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-blog-index',
    activeNav: '/destinacions',
    bodyHtml: body,
  });
}

/** E-mail sign-up box. Plain HTML form → /api/newsletter/subscribe (no JS). The hidden "website"
 *  field is a honeypot for bots; real visitors never see or fill it. */
function renderSubscribeForm(): string {
  return `<section class="subscribe" aria-labelledby="subscribe-title">
    <h3 id="subscribe-title">Rep els relats nous al correu</h3>
    <p>Un correu quan publico un relat. Res més.</p>
    <form method="post" action="/api/newsletter/subscribe">
      <div class="subscribe-row">
        <input type="email" name="email" required autocomplete="email" placeholder="el-teu@correu.cat" aria-label="El teu correu electrònic" maxlength="254">
        <button type="submit">Subscriu-me</button>
      </div>
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <label class="consent"><input type="checkbox" name="consent" value="1" required> Accepto rebre la newsletter de ${escapeHtml(SITE_NAME)} i que es guardi la meva adreça fins que em doni de baixa. Més informació a la <a href="/privacitat/">política de privacitat</a>.</label>
    </form>
  </section>`;
}

const NEWSLETTER_PAGES: Record<string, { title: string; text: string }> = {
  revisa: {
    title: 'Revisa el correu',
    text: 'T’hem enviat un missatge per confirmar la subscripció. Prem l’enllaç que hi trobaràs i ja està. Si no el veus d’aquí a uns minuts, mira la carpeta de correu brossa.',
  },
  confirmat: { title: 'Subscripció confirmada', text: 'Gràcies! A partir d’ara rebràs un correu cada vegada que publiqui un relat nou.' },
  'baixa-feta': { title: 'Ja t’has donat de baixa', text: 'No et tornaré a enviar cap correu. Si algun dia canvies d’idea, pots tornar-te a subscriure.' },
  error: { title: 'Alguna cosa no ha anat bé', text: 'L’enllaç no és vàlid o ha caducat, o s’han fet massa intents seguits. Torna-ho a provar d’aquí a una estona.' },
  'no-disponible': { title: 'Newsletter no disponible', text: 'La newsletter encara no està activa. Mentrestant, pots seguir el blog per RSS.' },
};

export function isNewsletterPage(kind: string): boolean {
  return kind === '' || kind === 'baixa' || kind in NEWSLETTER_PAGES;
}

/** Small standalone pages of the newsletter flow. `kind` '' is the sign-up page; 'baixa' shows the
 *  unsubscribe confirmation button for the given id/token. */
export function renderNewsletterPage(kind: string, params: { id?: string; t?: string } = {}): string {
  let inner: string;
  let title: string;
  if (kind === '') {
    title = 'Newsletter';
    inner = newsletterEnabled()
      ? `<h1>Newsletter</h1>${renderSubscribeForm()}`
      : `<h1>${NEWSLETTER_PAGES['no-disponible'].title}</h1><p>${NEWSLETTER_PAGES['no-disponible'].text}</p>`;
  } else if (kind === 'baixa') {
    title = 'Donar-se de baixa';
    const valid = /^[a-f0-9]{24}$/.test(params.id ?? '') && /^[a-f0-9]{16,128}$/.test(params.t ?? '');
    inner = valid
      ? `<h1>Vols donar-te de baixa?</h1><p>Deixaràs de rebre els relats nous per correu.</p>
    <form method="post" action="/api/newsletter/unsubscribe">
      <input type="hidden" name="id" value="${params.id}"><input type="hidden" name="t" value="${params.t}">
      <button type="submit" class="btn btn-solid">Sí, dona’m de baixa</button>
    </form>`
      : `<h1>${NEWSLETTER_PAGES.error.title}</h1><p>${NEWSLETTER_PAGES.error.text}</p>`;
  } else {
    const page = NEWSLETTER_PAGES[kind];
    if (!page) return render404();
    title = page.title;
    inner = `<h1>${page.title}</h1><p>${page.text}</p><p><a href="/blog">Torna als relats</a></p>`;
  }
  const layout = renderLayout({
    title: `${title} — ${SITE_NAME}`,
    description: TAGLINE,
    canonical: `${SITE}/newsletter/`,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-newsletter',
    bodyHtml: `<main class="page-newsletter">${inner}</main>`,
  });
  return layout.replace('<head>', '<head>\n<meta name="robots" content="noindex,nofollow">');
}

/** Privacy policy. A draft written for this blog's actual data handling — worth a read by the author. */
export function renderPrivacy(): string {
  const owner = AUTHOR_LEGAL_NAME ? `${escapeHtml(AUTHOR_LEGAL_NAME)}, titular de ${escapeHtml(SITE_NAME)}` : `${escapeHtml(SITE_NAME)} (${escapeHtml(AUTHOR_NAME)})`;
  const body = `<main class="page-article page-legal">
<article><div class="prose">
  <div class="title"><h1>Política de privacitat</h1></div>
  <hr>
  <h3>Qui és el responsable</h3>
  <p>${owner}. Pots escriure’m a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> per a qualsevol qüestió sobre les teves dades. Aquest és un blog personal, sense publicitat ni ingressos.</p>

  <h3>Newsletter</h3>
  <p>Si et subscrius, guardo la teva <strong>adreça de correu</strong>, el moment en què vas demanar la subscripció i en què la vas confirmar, la versió del text de consentiment que vas acceptar i si continues subscrit/a. La finalitat és enviar-te un correu quan publico un relat nou. La base legal és el teu <strong>consentiment</strong>, que pots retirar en qualsevol moment amb l’enllaç «Dona’t de baixa» de cada correu.</p>
  <p>La subscripció només es fa efectiva quan confirmes l’adreça amb l’enllaç que t’envio. <strong>Les adreces que no es confirmen s’esborren automàticament als 30 dies.</strong> Les subscripcions confirmades es conserven mentre estiguis subscrit/a; en donar-te de baixa deixo d’escriure’t i només conservo l’adreça marcada com a «de baixa» perquè no se’t torni a enviar res per error. Si vols que s’esborri del tot, demana-m’ho per correu.</p>

  <h3>Invitacions personals</h3>
  <p>Algunes vegades convido personalment una persona que conec a subscriure’s, amb un únic missatge que conté l’enllaç al formulari. La base és l’interès legítim a donar a conèixer el blog a persones del meu entorn, amb un missatge breu, personal i sense cap seguiment. No guardo l’adreça: només un codi irreversible, per no convidar la mateixa persona dues vegades. No s’inclou ningú a la llista sense que ho confirmi ell mateix. Si no t’interessa, ignora el missatge i no et tornaré a escriure.</p>

  <h3>Visites i valoracions</h3>
  <p>Per comptar visites úniques, el web calcula un codi irreversible a partir de l’adreça IP i d’una sal secreta que canvia cada dia; <strong>no es guarda la IP</strong>. Aquests codis es descarten passats dos dies i només en queda el recompte. Per evitar vots repetits a les valoracions per estrelles es guarda un altre codi irreversible per relat, mentre el relat és al web. La base legal és l’interès legítim a conèixer l’ús del blog i mantenir unes valoracions fiables. No faig servir galetes de seguiment ni publicitat.</p>

  <h3>Allotjament i serveis</h3>
  <p>El web està allotjat a <strong>Netlify</strong>, que, com qualsevol servidor, registra temporalment l’adreça IP de cada petició per raons de seguretat i funcionament. Les tipografies es serveixen des del mateix web: <strong>el teu navegador no contacta amb Google ni cap altre tercer</strong> en visitar les pàgines. Els correus de la newsletter els envia <strong>Brevo</strong> (Sendinblue SAS, França), que actua com a encarregat del tractament només per enviar-los. Aquests proveïdors poden tractar dades fora de la Unió Europea amb les garanties contractuals que exigeix la normativa.</p>
  <p>El panell d’administració fa servir una galeta de sessió que només utilitza l’autora.</p>

  <h3>Menors</h3>
  <p>Aquest web no va dirigit a menors de 14 anys. Si ets menor de 14 anys, no et subscriguis a la newsletter sense el consentiment dels teus pares o tutors.</p>

  <h3>Els teus drets</h3>
  <p>Pots demanar l’accés, la rectificació, la supressió, la limitació o l’oposició al tractament de les teves dades, i la seva portabilitat, escrivint a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Si creus que no s’han respectat, pots reclamar davant l’autoritat de protecció de dades (a Catalunya, l’<a href="https://apdcat.gencat.cat/" rel="noopener">Autoritat Catalana de Protecció de Dades</a>).</p>
  <p><em>Darrera actualització: octubre de 2026.</em></p>
</div></article>
</main>`;
  return renderLayout({
    title: `Política de privacitat — ${SITE_NAME}`,
    description: `Com es tracten les dades al blog ${SITE_NAME}.`,
    canonical: `${SITE}/privacitat/`,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-article page-legal',
    bodyHtml: body,
  });
}

export function render404(): string {
  const body = `<main class="page-404">
  <h1>Pàgina no trobada</h1>
  <p>Aquest camí no existeix. <a href="/">Torna a l’inici</a>.</p>
</main>`;
  return renderLayout({
    title: `Pàgina no trobada — ${SITE_NAME}`,
    description: 'Pàgina no trobada',
    canonical: `${SITE}/404/`,
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
<description>${escapeHtml(TAGLINE)}</description>
<link>${SITE}/</link>
${items}
</channel></rss>`;
}

export function renderSitemap(posts: IndexEntry[]): string {
  const urls = ['', 'blog', 'destinacions', 'about'].map((p) => `<url><loc>${SITE}/${p}${p ? '/' : ''}</loc></url>`);
  for (const p of posts) urls.push(`<url><loc>${SITE}/blog/${p.slug}/</loc></url>`);
  for (const c of usedCategories(posts)) urls.push(`<url><loc>${SITE}${categoryPath(c)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
