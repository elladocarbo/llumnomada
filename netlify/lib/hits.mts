import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

interface DayBucket {
  v: number;
  paths: Record<string, number>;
  uniq: Record<string, boolean>;
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
    out.push({ day, views: bucket?.v ?? 0, uniques: bucket ? Object.keys(bucket.uniq).length : 0 });
  }
  return out;
}
