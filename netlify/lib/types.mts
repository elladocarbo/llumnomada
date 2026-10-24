export type BlockType = 'p' | 'h3' | 'q' | 'img';

export interface Block {
  t: BlockType;
  /** Rich text for p/h3/q. For 'img', the image path (e.g. "/img/<id>") — not sanitized as text. */
  h: string;
  /** 'img' only: plain-text description for screen readers and search engines (stored unescaped). */
  alt?: string;
}

/** A place visited in a relat. `lat`/`lon` are missing while its position hasn't been found yet;
 *  `manual` means they were typed by hand and must never be overwritten by a lookup. */
export interface Place {
  name: string;
  lat?: number;
  lon?: number;
  manual?: boolean;
}

export interface Coords {
  lat: number;
  lon: number;
}

/** Optional "practical sheet" shown under the title; every field is plain text and optional. */
export interface PostInfo {
  days?: string;
  season?: string;
  budget?: string;
  transport?: string;
}

/** A relat translated to another language. Same blocks, in the same order (images keep their path
 *  and get a translated description). `draft` translations are only visible to the author. */
export interface PostTranslation {
  status: 'draft' | 'published';
  title: string;
  lead: string;
  blocks: Block[];
  location?: string;
  refs?: string[];
  info?: PostInfo;
  /** Translated name of the series and short name of this part. */
  series?: string;
  seriesLabel?: string;
  updated: string;
}

export type PostTranslations = Partial<Record<'es' | 'en', PostTranslation>>;

export interface Post {
  id: string;
  slug: string | null;
  title: string;
  categories: string[];
  lead: string;
  blocks: Block[];
  cover: string;
  refs: string[];
  location: string;
  /** Country, used to group relats on the "Destinacions" page. Empty for non-destination posts. */
  country?: string;
  /** Where to put this relat's pin on the world map of "Destinacions". */
  coords?: Coords;
  /** Location text the coordinates were looked up from; absent when they were typed by hand. */
  coordsFrom?: string;
  /** Name of the series this relat belongs to (e.g. a trip told in several parts). */
  series?: string;
  /** 0 = the series' overview post; 1, 2, 3… = its parts, in reading order. */
  seriesOrder?: number;
  /** Short name shown in the series list; falls back to the title. */
  seriesLabel?: string;
  /** Places visited, in order: drawn as a route on a static map at the top of the relat. */
  places?: Place[];
  /** Versions of this relat in other languages (Catalan is the post itself). */
  translations?: PostTranslations;
  date: string;
  updated: string;
  status: 'draft' | 'published';
  scheduledAt: string | null;
  reading: number;
  info?: PostInfo;
}

/** What lists need to know about a translation (no body). */
export interface EntryTranslation {
  status: 'draft' | 'published';
  title: string;
  lead?: string;
  location?: string;
  series?: string;
  seriesLabel?: string;
}

export type IndexEntry = Omit<Post, 'blocks' | 'refs' | 'info' | 'places' | 'translations'> & {
  i18n?: Partial<Record<'es' | 'en', EntryTranslation>>;
};

export interface Settings {
  /** Languages shown to everybody (the author can always preview the rest). Catalan is always on. */
  languages?: Array<'es' | 'en'>;
  instagram: string;
  portrait: string;
  categories: string[];
}

export interface SessionPayload {
  u: string;
  exp: number;
}
