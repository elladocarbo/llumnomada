import type { Block } from './types.mts';

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
          return `<figure class="prose-image">
  <a href="#${id}" class="prose-image-link" aria-label="Amplia la imatge"><img src="${block.h}" alt="" loading="lazy"></a>
</figure>
<a href="#_top" class="lightbox" id="${id}"><img src="${block.h}" alt=""></a>`;
        }
        case 'p':
        default:
          return `<p>${block.h}</p>`;
      }
    })
    .join('\n');
}
