export type BlockType = 'p' | 'h3' | 'q' | 'img';

export interface Block {
  t: BlockType;
  /** Rich text for p/h3/q. For 'img', the image path (e.g. "/img/<id>") — not sanitized as text. */
  h: string;
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
  date: string;
  updated: string;
  status: 'draft' | 'published';
  scheduledAt: string | null;
  reading: number;
}

export type IndexEntry = Omit<Post, 'blocks' | 'refs'>;

export interface Settings {
  instagram: string;
  portrait: string;
  categories: string[];
}

export interface SessionPayload {
  u: string;
  exp: number;
}
