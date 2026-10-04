export type BlockType = 'p' | 'h3' | 'q' | 'img';

export interface Block {
  t: BlockType;
  /** Rich text for p/h3/q. For 'img', the image path (e.g. "/img/<id>") — not sanitized as text. */
  h: string;
  /** 'img' only: plain-text description for screen readers and search engines (stored unescaped). */
  alt?: string;
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
  date: string;
  updated: string;
  status: 'draft' | 'published';
  scheduledAt: string | null;
  reading: number;
  info?: PostInfo;
}

export type IndexEntry = Omit<Post, 'blocks' | 'refs' | 'info'>;

export interface Settings {
  instagram: string;
  portrait: string;
  categories: string[];
}

export interface SessionPayload {
  u: string;
  exp: number;
}
