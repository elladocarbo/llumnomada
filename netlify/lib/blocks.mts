import type { Block } from './types.mts';
import { decodeHtmlEntities, escapeHtml } from './sanitize.mts';
import { imageSrcset, imageUrl } from './images.mts';

const WORDS_PER_MINUTE = 200;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

export function calcReadingMinutes(lead: string, blocks: Block[]): number {
  const words = [lead, ...blocks.filter((b) => b.t !== 'img').map((b) => b.h)]
    .map(stripTags)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function headingSlug(html: string): string {
  return decodeHtmlEntities(stripTags(html))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Anchor id for every 'h3' block (by block index), unique within the post. */
function headingIds(blocks: Block[]): Map<number, string> {
  const ids = new Map<number, string>();
  const used = new Set<string>();
  blocks.forEach((b, i) => {
    if (b.t !== 'h3') return;
    const base = 's-' + (headingSlug(b.h) || String(ids.size + 1));
    let id = base;
    for (let n = 2; used.has(id); n++) id = base + '-' + n;
    used.add(id);
    ids.set(i, id);
  });
  return ids;
}

/** Collapsible table of contents built from the post's subtitles (needs at least 3). Pure HTML
 *  (<details>), no JS. */
export function renderToc(blocks: Block[]): string {
  const ids = headingIds(blocks);
  if (ids.size < 3) return '';
  const items = [...ids.entries()]
    .map(([i, id]) => `<li><a href="#${id}">${stripTags(blocks[i].h).replace(/\s+/g, ' ').trim()}</a></li>`)
    .join('');
  return `<nav class="toc" aria-label="Índex del relat"><details><summary>Índex del relat <span>(${ids.size} seccions)</span></summary><ol>${items}</ol></details></nav>`;
}

/** Renders a post's block list to article-body HTML. Block `h` is expected to already be
 *  sanitized (only strong/em/br, or a validated /img/ path for 'img') by sanitize.mts at
 *  write time — this does not re-sanitize. Images render as a click-to-enlarge figure: a
 *  thumbnail link jumping to a `:target`-shown fullscreen overlay, no JS required. */
export function renderBlocks(blocks: Block[]): string {
  const ids = headingIds(blocks);
  return blocks
    .map((block, i) => {
      switch (block.t) {
        case 'h3':
          return `<h3 id="${ids.get(i)}">${block.h}</h3>`;
        case 'q':
          return `<blockquote>${block.h}</blockquote>`;
        case 'img': {
          const id = `lightbox-${i}`;
          const alt = escapeHtml(block.alt ?? '');
          const srcset = imageSrcset(block.h, [400, 640, 960]);
          const thumbAttrs = srcset
            ? `src="${imageUrl(block.h, 640)}" srcset="${srcset}" sizes="(max-width: 720px) 85vw, 520px"`
            : `src="${block.h}"`;
          // The overlay image is lazy on purpose: inside a display:none box a lazy <img> isn't
          // fetched until :target reveals it, so enlarged copies don't load with the page.
          return `<figure class="prose-image">
  <a href="#${id}" class="prose-image-link" aria-label="Amplia la imatge"><img ${thumbAttrs} alt="${alt}" loading="lazy" decoding="async"></a>
</figure>
<a href="#_top" class="lightbox" id="${id}"><img src="${imageUrl(block.h, 1600)}" alt="${alt}" loading="lazy" decoding="async"></a>`;
        }
        case 'p':
        default:
          return `<p>${block.h}</p>`;
      }
    })
    .join('\n');
}
