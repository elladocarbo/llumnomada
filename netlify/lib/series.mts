import type { IndexEntry } from './types.mts';

/** URL slug of a series name: "Irlanda – L'illa Maragda" → "irlanda-l-illa-maragda". */
export function seriesSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

type SeriesFields = { series?: string; seriesOrder?: number };

/** A numbered part (1, 2, 3…) of a series. Order 0 is the series' own overview post, which stays
 *  visible in the normal lists; numbered parts are reached through the series page. */
export function isSeriesPart(p: SeriesFields): boolean {
  return Boolean(p.series) && (p.seriesOrder ?? 0) > 0;
}

/** Published posts of a series, in reading order (overview first, then part 1, 2, 3…). */
export function seriesMembers(index: IndexEntry[], name: string): IndexEntry[] {
  const slug = seriesSlug(name);
  return index
    .filter((p) => p.status === 'published' && p.slug && p.series && seriesSlug(p.series) === slug)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
}
