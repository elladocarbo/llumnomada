import type { Block } from './types.mts';
import { escapeHtml } from './sanitize.mts';
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

/** Renders a post's block list to article-body HTML. Block `h` is expected to already be
 *  sanitized (only strong/em/br, or a validated /img/ path for 'img') by sanitize.mts at
 *  write time — this does not re-sanitize. Images render as a click-to-enlarge figure: a
 *  thumbnail link jumping to a `:target`-shown fullscreen overlay, no JS required. */
export function renderBlocks(blocks: Block[]): string {
  return blocks
    .map((block, i) => {
      switch (block.t) {
        case 'h3':
          return `<h3>${block.h}</h3>`;
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
