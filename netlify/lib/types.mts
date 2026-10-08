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
  date: string;
  updated: string;
  status: 'draft' | 'published';
  scheduledAt: string | null;
  reading: number;
  info?: PostInfo;
}

export type IndexEntry = Omit<Post, 'blocks' | 'refs' | 'info' | 'places'>;

export interface Settings {
  instagram: string;
  portrait: string;
  categories: string[];
}

export interface SessionPayload {
  u: string;
  exp: number;
}
