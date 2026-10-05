import type { Config } from '@netlify/functions';
import { getPost, listIndex, savePost } from '../lib/store.mts';
import { purgeBlogCache } from '../lib/cache.mts';
import { maybeRunDailyCleanup } from '../lib/newsletter.mts';

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

  // Once a day: drop unconfirmed newsletter sign-ups older than 30 days (see the privacy policy).
  try {
    await maybeRunDailyCleanup();
  } catch {
    // housekeeping must never break scheduled publishing
  }

  return new Response(JSON.stringify({ ok: true, published }), { headers: { 'content-type': 'application/json' } });
};

export const config: Config = {
  schedule: '*/5 * * * *',
};
