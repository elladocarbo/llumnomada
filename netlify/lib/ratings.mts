import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const RATING_LEGEND: string[] = [
  "No se m'hi ha perdut res, aquí.",
  'No és prioritari.',
  'Ho incloc a la llista de viatges futurs.',
  'És el meu proper destí.',
  'Ja hi estic volant!',
];

export interface RatingSummary {
  counts: [number, number, number, number, number];
  total: number;
  avg: number;
}

const EMPTY: RatingSummary = { counts: [0, 0, 0, 0, 0], total: 0, avg: 0 };

// Strong consistency: a vote is immediately followed by a redirect back to the article, which
// re-reads this same summary — the default eventually-consistent read can still show the
// pre-vote count right after casting it, which looks like the vote silently failed.
function ratingsStore() {
  return getStore({ name: 'ratings', consistency: 'strong' });
}

/** Stable (non-time-boxed) anonymized voter key: same visitor + same post always hashes the
 *  same, so a repeat vote can be recognized — but the raw IP is never stored. */
function voterHash(postId: string, ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:vote:${postId}:${ip}`).digest('hex').slice(0, 24);
}

export async function getSummary(postId: string): Promise<RatingSummary> {
  const store = ratingsStore();
  const summary = (await store.get(`summary/${postId}`, { type: 'json' })) as RatingSummary | null;
  return summary ?? EMPTY;
}

export async function hasVoted(postId: string, ip: string, secret: string): Promise<boolean> {
  const store = ratingsStore();
  const key = `voters/${postId}/${voterHash(postId, ip, secret)}`;
  const seen = await store.get(key);
  return seen != null;
}

/** Records a 1-5 vote for a post. No-ops (returns the unchanged summary) if this visitor has
 *  already voted on this post, or if `stars` is out of range. */
export async function castVote(postId: string, ip: string, secret: string, stars: number): Promise<RatingSummary> {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return getSummary(postId);

  const store = ratingsStore();
  const voterKey = `voters/${postId}/${voterHash(postId, ip, secret)}`;
  const { modified } = await store.set(voterKey, '1', { onlyIfNew: true });
  if (!modified) return getSummary(postId);

  const summary = await getSummary(postId);
  const counts = [...summary.counts] as RatingSummary['counts'];
  counts[stars - 1] += 1;
  const total = summary.total + 1;
  const sum = counts.reduce((acc, c, i) => acc + c * (i + 1), 0);
  const avg = total > 0 ? sum / total : 0;
  const next: RatingSummary = { counts, total, avg };

  await store.setJSON(`summary/${postId}`, next);
  return next;
}
