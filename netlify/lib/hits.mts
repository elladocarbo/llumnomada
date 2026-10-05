import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

interface DayBucket {
  v: number;
  paths: Record<string, number>;
  /** Hashes of the day's visitors; dropped (leaving only `u`) once the day is over — see compactOldDays. */
  uniq?: Record<string, boolean>;
  /** Unique-visitor count kept after the hashes are discarded. */
  u?: number;
}

function hitsStore() {
  return getStore('hits');
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function anonymize(ip: string, day: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${day}:${ip}`).digest('hex').slice(0, 24);
}

/** Records one page view. Never stores the raw IP — only a daily-salted, truncated hash. */
export async function recordHit(path: string, ip: string, secret: string): Promise<void> {
  const day = dayKey();
  const key = `day/${day}`;
  const store = hitsStore();
  const bucket = ((await store.get(key, { type: 'json' })) as DayBucket | null) ?? { v: 0, paths: {}, uniq: {} };
  bucket.uniq ??= {};

  bucket.v += 1;
  bucket.paths[path] = (bucket.paths[path] ?? 0) + 1;
  bucket.uniq[anonymize(ip, day, secret)] = true;

  await store.setJSON(key, bucket);
}

export interface DayStat {
  day: string;
  views: number;
  uniques: number;
}

export async function getStats(days: number): Promise<DayStat[]> {
  const store = hitsStore();
  const out: DayStat[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const day = dayKey(d);
    const bucket = (await store.get(`day/${day}`, { type: 'json' })) as DayBucket | null;
    out.push({ day, views: bucket?.v ?? 0, uniques: bucket ? (bucket.u ?? Object.keys(bucket.uniq ?? {}).length) : 0 });
  }
  return out;
}

/** Data minimisation: once a day is over, the per-visitor hashes are replaced by their count. */
export async function compactOldDays(keepDays = 2): Promise<number> {
  const store = hitsStore();
  const cutoff = dayKey(new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000));
  const { blobs } = await store.list({ prefix: 'day/' });
  let compacted = 0;
  for (const b of blobs) {
    const day = b.key.slice('day/'.length);
    if (day >= cutoff) continue;
    const bucket = (await store.get(b.key, { type: 'json' })) as DayBucket | null;
    if (!bucket?.uniq) continue;
    await store.setJSON(b.key, { v: bucket.v, paths: bucket.paths, u: Object.keys(bucket.uniq).length });
    compacted++;
  }
  return compacted;
}
