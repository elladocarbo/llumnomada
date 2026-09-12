import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
  checkLockout,
  clearLoginFailures,
  clearSessionCookieHeader,
  getClientIp,
  getSessionFromRequest,
  recordLoginFailure,
  sessionCookieHeader,
  signSession,
} from '../lib/auth.mts';
import { deletePost, getPost, listIndex, getSettings, newPostId, saveSettings, savePost } from '../lib/store.mts';
import { sanitizeRichText } from '../lib/sanitize.mts';
import { renderPreview } from '../lib/html.mts';
import { purgeBlogCache, noStoreHeaders } from '../lib/cache.mts';
import { getStats } from '../lib/hits.mts';
import type { Block, Post, Settings } from '../lib/types.mts';
import { SESSION_TTL_SECONDS } from '../lib/config.mts';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: noStoreHeaders({ 'content-type': 'application/json' }) });
}

function getAdminCredentials(): Array<{ u: string; p: string }> {
  const raw = process.env.ADMIN_CREDENTIALS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to single-user fallback
    }
  }
  const u = process.env.ADMIN_USER;
  const p = process.env.ADMIN_PASSWORD;
  return u && p ? [{ u, p }] : [];
}

function requireAuth(request: Request): { u: string; exp: number } | Response {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return json({ error: 'server_not_configured' }, 500);
  const session = getSessionFromRequest(request, secret);
  if (!session) return json({ error: 'unauthorized' }, 401);
  return session;
}

const IMAGE_PATH = /^\/img\/[a-zA-Z0-9-]{1,100}$/;

function sanitizeBlocks(blocks: unknown): Block[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b && typeof b === 'object')
    .map((b: any): Block | null => {
      if (b.t === 'img') {
        const path = String(b.h ?? '');
        return IMAGE_PATH.test(path) ? { t: 'img', h: path } : null;
      }
      const t = b.t === 'h3' || b.t === 'q' ? b.t : 'p';
      return { t, h: sanitizeRichText(String(b.h ?? '')) };
    })
    .filter((b): b is Block => b !== null);
}

function sanitizeStringArray(v: unknown, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s ?? '').slice(0, maxLen)).filter(Boolean);
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  const secureCookie = url.protocol === 'https:';

  if (path === '/login' && method === 'POST') {
    const ip = getClientIp(request, context);
    const lock = await checkLockout(ip);
    if (lock.locked) {
      return json({ error: 'locked', retryAfterMs: lock.retryAfterMs }, 429);
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) return json({ error: 'server_not_configured' }, 500);

    let body: { u?: string; p?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400);
    }

    const creds = getAdminCredentials();
    const match = creds.find((c) => c.u === body.u && c.p === body.p);
    if (!match) {
      await recordLoginFailure(ip);
      return json({ error: 'invalid_credentials' }, 401);
    }

    await clearLoginFailures(ip);
    const token = signSession(match.u, secret);
    return new Response(JSON.stringify({ ok: true, user: match.u }), {
      status: 200,
      headers: noStoreHeaders({
        'content-type': 'application/json',
        'set-cookie': sessionCookieHeader(token, SESSION_TTL_SECONDS, secureCookie),
      }),
    });
  }

  if (path === '/logout' && method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: noStoreHeaders({ 'content-type': 'application/json', 'set-cookie': clearSessionCookieHeader(secureCookie) }),
    });
  }

  // Everything past this point requires a valid session.
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  if (path === '/me' && method === 'GET') {
    return json({ user: auth.u });
  }

  if (path === '/settings' && method === 'GET') {
    return json(await getSettings());
  }

  if (path === '/settings' && method === 'POST') {
    const body = (await request.json()) as Partial<Settings>;
    const settings: Settings = {
      instagram: String(body.instagram ?? '').slice(0, 200),
      portrait: String(body.portrait ?? '').slice(0, 300),
      categories: sanitizeStringArray(body.categories, 50).slice(0, 50),
    };
    await saveSettings(settings);
    return json(settings);
  }

  if (path === '/posts' && method === 'GET') {
    return json(await listIndex());
  }

  if (path === '/posts' && method === 'POST') {
    const body = (await request.json()) as Partial<Post>;
    const id = body.id && typeof body.id === 'string' ? body.id : await newPostId();
    const existing = await getPost(id);

    const post: Post = {
      id,
      slug: existing?.slug ?? null,
      title: String(body.title ?? '').slice(0, 200),
      categories: sanitizeStringArray(body.categories, 50),
      lead: sanitizeRichText(String(body.lead ?? '')),
      blocks: sanitizeBlocks(body.blocks),
      cover: String(body.cover ?? '').slice(0, 300),
      refs: sanitizeStringArray(body.refs, 500),
      location: String(body.location ?? '').slice(0, 200),
      date: body.date ? String(body.date) : (existing?.date ?? new Date().toISOString()),
      updated: existing?.updated ?? new Date().toISOString(),
      status: body.status === 'published' ? 'published' : 'draft',
      scheduledAt: body.scheduledAt ? String(body.scheduledAt) : null,
      reading: existing?.reading ?? 1,
    };

    const saved = await savePost(post);
    await purgeBlogCache();
    return json(saved);
  }

  const postMatch = path.match(/^\/posts\/([^/]+)$/);
  if (postMatch && method === 'GET') {
    const post = await getPost(postMatch[1]);
    if (!post) return json({ error: 'not_found' }, 404);
    return json(post);
  }

  if (postMatch && method === 'DELETE') {
    await deletePost(postMatch[1]);
    await purgeBlogCache();
    return json({ ok: true });
  }

  if (path === '/preview' && method === 'POST') {
    const body = (await request.json()) as Partial<Post>;
    const html = renderPreview({
      title: String(body.title ?? ''),
      lead: sanitizeRichText(String(body.lead ?? '')),
      blocks: sanitizeBlocks(body.blocks),
      cover: String(body.cover ?? ''),
      categories: sanitizeStringArray(body.categories, 50),
      location: String(body.location ?? ''),
      date: body.date ? String(body.date) : new Date().toISOString(),
      updated: new Date().toISOString(),
      refs: sanitizeStringArray(body.refs, 500),
    });
    return new Response(html, { headers: noStoreHeaders({ 'content-type': 'text/html; charset=utf-8' }) });
  }

  if (path === '/images' && method === 'POST') {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'no_file' }, 400);
    if (file.size > MAX_IMAGE_BYTES) return json({ error: 'too_large' }, 413);
    if (!file.type.startsWith('image/')) return json({ error: 'not_an_image' }, 400);

    const id = crypto.randomUUID();
    const buf = await file.arrayBuffer();
    await getStore('images').set(id, buf, { metadata: { type: file.type } });
    return json({ id, url: `/img/${id}` });
  }

  if (path === '/stats' && method === 'GET') {
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '30')));
    return json(await getStats(days));
  }

  return json({ error: 'not_found' }, 404);
};
