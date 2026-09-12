import { getStore } from '@netlify/blobs';
import type { IndexEntry, Post, Settings } from './types.mts';
import { SEED_POSTS } from '../seed/posts.mts';
import { SEED_SETTINGS } from '../seed/settings.mts';
import { calcReadingMinutes } from './blocks.mts';

// 'strong' consistency bypasses Netlify Blobs' own (eventual, edge-cached) read path — the
// default silently serves stale data for an unbounded time after a write, independent of and
// invisible to HTTP/CDN cache purges. This is a small, low-traffic dataset, so the latency
// cost of always reading the latest write is worth never showing readers stale content.
function blogStore() {
  return getStore('blog', { consistency: 'strong' });
}

function toIndexEntry(post: Post): IndexEntry {
  const { blocks, refs, ...rest } = post;
  void blocks;
  void refs;
  return rest;
}

async function seedIfEmpty(): Promise<void> {
  const store = blogStore();
  const { modified } = await store.setJSON('seeded', true, { onlyIfNew: true });
  if (!modified) return; // someone else already seeded (or this isn't the first boot)

  const posts: Post[] = SEED_POSTS.map((seed) => ({
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    categories: seed.categories,
    lead: seed.lead,
    blocks: seed.blocks,
    cover: seed.cover,
    refs: seed.refs,
    location: seed.location,
    date: seed.date,
    updated: seed.date,
    status: seed.status,
    scheduledAt: seed.scheduledAt,
    reading: calcReadingMinutes(seed.lead, seed.blocks),
  }));

  for (const post of posts) {
    await store.setJSON(`posts/${post.id}.json`, post);
  }

  const index = posts
    .map(toIndexEntry)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  await store.setJSON('index.json', index);
  await store.setJSON('settings.json', SEED_SETTINGS);
}

export async function listIndex(): Promise<IndexEntry[]> {
  await seedIfEmpty();
  const store = blogStore();
  const index = (await store.get('index.json', { type: 'json' })) as IndexEntry[] | null;
  return index ?? [];
}

export async function getPost(id: string): Promise<Post | null> {
  await seedIfEmpty();
  const store = blogStore();
  return (await store.get(`posts/${id}.json`, { type: 'json' })) as Post | null;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const index = await listIndex();
  const entry = index.find((p) => p.slug === slug);
  if (!entry) return null;
  return getPost(entry.id);
}

function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (à→a, ò→o, ü→u...)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  const index = await listIndex();
  const taken = new Set(index.map((p) => p.slug).filter(Boolean));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Saves a post: upserts posts/<id>.json and incrementally updates index.json.
 *  Freezes `slug` on first publish (stable permalinks) — never changes afterwards. */
export async function savePost(post: Post): Promise<Post> {
  const store = blogStore();

  if (post.status === 'published' && !post.slug) {
    post.slug = await uniqueSlug(slugify(post.title) || post.id);
  }
  post.reading = calcReadingMinutes(post.lead, post.blocks);
  post.updated = new Date().toISOString();

  await store.setJSON(`posts/${post.id}.json`, post);

  const index = await listIndex();
  const withoutThis = index.filter((p) => p.id !== post.id);
  const next = [...withoutThis, toIndexEntry(post)].sort((a, b) => (a.date < b.date ? 1 : -1));
  await store.setJSON('index.json', next);

  return post;
}

export async function deletePost(id: string): Promise<void> {
  const store = blogStore();
  await store.delete(`posts/${id}.json`);
  const index = await listIndex();
  await store.setJSON('index.json', index.filter((p) => p.id !== id));
}

export async function getSettings(): Promise<Settings> {
  await seedIfEmpty();
  const store = blogStore();
  return ((await store.get('settings.json', { type: 'json' })) as Settings | null) ?? SEED_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await blogStore().setJSON('settings.json', settings);
}

export async function newPostId(): Promise<string> {
  return crypto.randomUUID();
}
