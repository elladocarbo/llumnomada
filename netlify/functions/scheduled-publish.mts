import type { Config } from '@netlify/functions';
import { getPost, listIndex, savePost } from '../lib/store.mts';
import { purgeBlogCache } from '../lib/cache.mts';

export default async () => {
  const index = await listIndex();
  const now = Date.now();
  const due = index.filter((p) => p.status === 'draft' && p.scheduledAt && new Date(p.scheduledAt).getTime() <= now);

  let published = 0;
  for (const entry of due) {
    const post = await getPost(entry.id);
    if (!post) continue;
    post.status = 'published';
    post.scheduledAt = null;
    await savePost(post);
    published += 1;
  }

  if (published > 0) await purgeBlogCache();

  return new Response(JSON.stringify({ ok: true, published }), { headers: { 'content-type': 'application/json' } });
};

export const config: Config = {
  schedule: '*/5 * * * *',
};
