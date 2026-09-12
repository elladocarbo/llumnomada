import type { Block, IndexEntry, Post } from './types.mts';
import { SITE, SITE_NAME, TAGLINE, AUTHOR_NAME, CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from './config.mts';
import { escapeHtml } from './sanitize.mts';
import { renderBlocks } from './blocks.mts';
import { ABOUT_BLOCKS, ABOUT_COVER, ABOUT_DESCRIPTION, ABOUT_LEAD, ABOUT_SUMMARY, ABOUT_TITLE } from '../seed/about.mts';

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
  activeNav?: '/' | '/blog' | '/about';
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
<meta name="description" content="${escapeHtml(opts.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${opts.canonical}">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${escapeHtml(opts.description)}">
<meta property="og:image" content="${opts.ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;600&family=Uncial+Antiqua&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${opts.jsonLd ? jsonLdScript(opts.jsonLd) : ''}
</head>
<body class="${opts.bodyClass}">
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
    <a href="mailto:${CONTACT_EMAIL}">Contacte</a>
    <a href="/panel" id="admin-link" hidden>Panell</a>
  </div>
</footer>
<script>fetch('/api/me').then(function(r){if(r.ok)document.getElementById('admin-link').hidden=false}).catch(function(){})</script>`;
}

function tagsHtml(categories: string[]): string {
  if (!categories?.length) return '';
  return `<div class="tags">${categories.map((c) => `<span class="tag">${escapeHtml(c)}</span>`).join('')}</div>`;
}

function metaRow(date: string, updated: string, location?: string): string {
  const parts = [`<time datetime="${date}">${formatDate(date)}</time>`];
  if (location) parts.push(`<span class="location">${escapeHtml(location)}</span>`);
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

function refsHtml(refs?: string[]): string {
  if (!refs?.length) return '';
  return `<ol class="refs">${refs.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ol>`;
}

function renderArticleBody(a: ArticleLike): string {
  return `<main class="page-article">
<article>
  ${a.cover ? `<div class="hero-image"><img src="${escapeHtml(a.cover)}" alt=""></div>` : ''}
  <div class="prose">
    <div class="title">
      ${metaRow(a.date, a.updated, a.location)}
      ${tagsHtml(a.categories ?? [])}
      <h1>${escapeHtml(a.title)}</h1>
    </div>
    <hr>
    <p>${a.lead}</p>
    ${renderBlocks(a.blocks)}
    ${refsHtml(a.refs)}
    <div class="ornament-rombo" aria-hidden="true">◆</div>
  </div>
</article>
</main>`;
}

export function renderArticle(post: Post): string {
  const canonical = `${SITE}/blog/${post.slug}/`;
  return renderLayout({
    title: `${post.title} — ${SITE_NAME}`,
    description: post.lead.replace(/<[^>]+>/g, '').slice(0, 200),
    canonical,
    ogImage: ogImageUrl(post.cover || '/images/hero-home.svg'),
    bodyClass: 'page-article',
    activeNav: '/blog',
    bodyHtml: renderArticleBody({
      title: post.title,
      lead: post.lead,
      blocks: post.blocks,
      cover: post.cover,
      categories: post.categories,
      location: post.location,
      date: post.date,
      updated: post.updated,
      refs: post.refs,
    }),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.lead.replace(/<[^>]+>/g, ''),
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
export function renderPreview(post: Pick<Post, 'title' | 'lead' | 'blocks' | 'cover' | 'categories' | 'location' | 'date' | 'updated' | 'refs'>): string {
  const layout = renderLayout({
    title: `${post.title || '(Sense títol)'} — ${SITE_NAME}`,
    description: (post.lead || '').replace(/<[^>]+>/g, '').slice(0, 200),
    canonical: `${SITE}/`,
    ogImage: ogImageUrl(post.cover || '/images/hero-home.svg'),
    bodyClass: 'page-article page-preview',
    bodyHtml: renderArticleBody(post),
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
        <img src="${escapeHtml(p.cover)}" alt="" loading="lazy">
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

export function renderBlogIndex(posts: IndexEntry[]): string {
  const items = posts
    .map(
      (p, i) => `<li class="${i === 0 ? 'featured' : ''}"><a href="/blog/${p.slug}/">
        <img src="${escapeHtml(p.cover)}" alt="" loading="lazy">
        <h4 class="title">${escapeHtml(p.title)}</h4>
        <div class="meta"><time datetime="${p.date}">${formatDate(p.date)}</time>${p.location ? `<span class="location">${escapeHtml(p.location)}</span>` : ''}</div>
      </a></li>`,
    )
    .join('');

  const body = `<main class="page-blog-index">
  <h1>Relats</h1>
  <ul>${items}</ul>
</main>`;

  return renderLayout({
    title: `Relats — ${SITE_NAME}`,
    description: TAGLINE,
    canonical: `${SITE}/blog/`,
    ogImage: ogImageUrl('/images/hero-home.svg'),
    bodyClass: 'page-blog-index',
    activeNav: '/blog',
    bodyHtml: body,
  });
}

export function render404(): string {
  const body = `<main class="page-404">
  <h1>Pàgina no trobada</h1>
  <p>Aquest camí no existeix. <a href="/">Torna a l'inici</a>.</p>
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
  const urls = ['', 'blog', 'about'].map((p) => `<url><loc>${SITE}/${p}${p ? '/' : ''}</loc></url>`);
  for (const p of posts) urls.push(`<url><loc>${SITE}/blog/${p.slug}/</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
