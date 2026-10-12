/** URL slug of a title: "Berlín - L’Atenes de l’Spree" → "berlin-l-atenes-de-l-spree". */
export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (à→a, ò→o, ü→u...)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
