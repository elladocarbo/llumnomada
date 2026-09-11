import type { Block } from './types.mts';

const WORDS_PER_MINUTE = 200;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

export function calcReadingMinutes(lead: string, blocks: Block[]): number {
  const words = [lead, ...blocks.map((b) => b.h)]
    .map(stripTags)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Renders a post's block list to article-body HTML. Block `h` is expected to already be
 *  sanitized (only strong/em/br) by sanitize.mts at write time — this does not re-sanitize. */
export function renderBlocks(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.t) {
        case 'h3':
          return `<h3>${block.h}</h3>`;
        case 'q':
          return `<blockquote>${block.h}</blockquote>`;
        case 'p':
        default:
          return `<p>${block.h}</p>`;
      }
    })
    .join('\n');
}
