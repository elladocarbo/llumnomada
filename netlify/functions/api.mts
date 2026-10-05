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
import { castVote } from '../lib/ratings.mts';
import { geocodeLocation } from '../lib/geocode.mts';
import type { Block, Coords, Post, PostInfo, Settings } from '../lib/types.mts';
import { CONTACT_EMAIL, SESSION_TTL_SECONDS } from '../lib/config.mts';
import { newsletterEnabled } from '../lib/newsletter-config.mts';
import {
  allowRequest,
  confirmSubscription,
  confirmationEmail,
  deleteSubscriber,
  hashVisitor,
  listSubscribers,
  normalizeEmail,
  postEmail,
  requestSubscription,
  sendEmail,
  sendPostBatch,
  sentCount,
  subscribersCsv,
  unsubscribe,
} from '../lib/newsletter.mts';

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
        if (!IMAGE_PATH.test(path)) return null;
        const alt = String(b.alt ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 250);
        return alt ? { t: 'img', h: path, alt } : { t: 'img', h: path };
      }
      const t = b.t === 'h3' || b.t === 'q' ? b.t : 'p';
      return { t, h: sanitizeRichText(String(b.h ?? '')) };
    })
    .filter((b): b is Block => b !== null);
}

const INFO_KEYS = ['days', 'season', 'budget', 'transport'] as const;

function sanitizeInfo(v: unknown): PostInfo | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: PostInfo = {};
  for (const key of INFO_KEYS) {
    const text = String((v as Record<string, unknown>)[key] ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (text) out[key] = text;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Accepts "53.35, -6.26" (latitude, longitude — the format Google Maps copies). undefined keeps
 *  the current value, an empty value clears it, and an unparseable one is ignored. */
function sanitizeCoords(v: unknown, current?: Coords): Coords | undefined {
  if (v === undefined) return current;
  if (v === null || String(v).trim() === '') return undefined;
  const m = String(v).match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return current;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : current;
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

  // Public: any reader can rate a post, no login needed. One vote per visitor per post,
  // enforced server-side by an anonymized IP hash (see ratings.mts) — never stores the raw IP.
  const rateMatch = path.match(/^\/rate\/([^/]+)$/);
  if (rateMatch && method === 'POST') {
    const postId = rateMatch[1];
    const secret = process.env.SESSION_SECRET;
    let stars = 0;
    try {
      const form = await request.formData();
      stars = Number(form.get('stars'));
    } catch {
      // ignore malformed submissions — just redirect back without recording a vote
    }
    if (secret) {
      await castVote(postId, getClientIp(request, context), secret, stars);
    }
    // Redirect back to the referring page's *path* only — never the raw header value, which a
    // scripted (non-browser) request could set to an arbitrary off-site URL (open-redirect).
    // postId is the post's internal id, not its slug, so a missing/foreign referer falls back
    // to the listing rather than guessing a URL.
    let back = '/blog';
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (refUrl.origin === url.origin) back = refUrl.pathname + refUrl.search;
      } catch {
        // malformed referer — keep the safe default
      }
    }
    return new Response(null, { status: 303, headers: noStoreHeaders({ location: back }) });
  }

  // ---- Newsletter: public endpoints (subscribe, confirm, unsubscribe) ----
  const seeOther = (where: string) => new Response(null, { status: 303, headers: noStoreHeaders({ location: where }) });

  if (path === '/newsletter/subscribe' && method === 'POST') {
    if (!newsletterEnabled()) return seeOther('/newsletter/no-disponible/');
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return seeOther('/newsletter/error/');
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return seeOther('/newsletter/error/');
    }
    if (String(form.get('website') ?? '')) return seeOther('/newsletter/revisa/'); // honeypot: bots fill it
    const email = normalizeEmail(form.get('email'));
    const secret = process.env.SESSION_SECRET;
    if (!email || form.get('consent') !== '1' || !secret) return seeOther('/newsletter/error/');
    if (!(await allowRequest(hashVisitor(getClientIp(request, context), secret)))) return seeOther('/newsletter/error/');

    const { subscriber, sendConfirmation } = await requestSubscription(email);
    if (sendConfirmation && !(await sendEmail(confirmationEmail(subscriber)))) return seeOther('/newsletter/error/');
    // Same answer whether or not the address was already subscribed, so it can't be probed.
    return seeOther('/newsletter/revisa/');
  }

  if (path === '/newsletter/confirm' && method === 'GET') {
    const ok = await confirmSubscription(url.searchParams.get('id') ?? '', url.searchParams.get('t') ?? '');
    return seeOther(ok ? '/newsletter/confirmat/' : '/newsletter/error/');
  }

  if (path === '/newsletter/unsubscribe') {
    // A plain GET (a link in a mail) only opens the confirmation page: mail scanners that pre-open
    // links must not unsubscribe anyone. The actual unsubscribe is a POST (button or one-click header).
    if (method === 'GET') {
      return seeOther(`/newsletter/baixa/?id=${encodeURIComponent(url.searchParams.get('id') ?? '')}&t=${encodeURIComponent(url.searchParams.get('t') ?? '')}`);
    }
    if (method === 'POST') {
      let id = url.searchParams.get('id') ?? '';
      let token = url.searchParams.get('t') ?? '';
      try {
        const form = await request.formData();
        id = String(form.get('id') ?? id);
        token = String(form.get('t') ?? token);
      } catch {
        // one-click POSTs carry the ids in the query string
      }
      const ok = await unsubscribe(id, token);
      if ((request.headers.get('accept') ?? '').includes('text/html')) return seeOther(ok ? '/newsletter/baixa-feta/' : '/newsletter/error/');
      return new Response(ok ? 'ok' : 'invalid', { status: ok ? 200 : 400, headers: noStoreHeaders({ 'content-type': 'text/plain' }) });
    }
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
      // Scripts that re-save a post without sending 'info' must not wipe it; the panel always sends it.
      info: body.info === undefined ? existing?.info : sanitizeInfo(body.info),
      country: body.country === undefined ? existing?.country : String(body.country).replace(/[<>]/g, '').trim().slice(0, 80),
    };

    // Map position: coordinates typed in the panel win; otherwise they are looked up from the
    // location text. The text used is remembered (coordsFrom) so a lookup is only repeated when the
    // location changes; typed coordinates have no coordsFrom and are never overwritten.
    let coords = existing?.coords;
    let coordsFrom = existing?.coordsFrom;
    if (body.coords !== undefined) {
      const typed = sanitizeCoords(body.coords, undefined);
      if (typed) {
        if (typed.lat !== coords?.lat || typed.lon !== coords?.lon) {
          coords = typed;
          coordsFrom = undefined;
        }
      } else if (String(body.coords ?? '').trim() === '') {
        coords = undefined;
        coordsFrom = undefined;
      }
    }
    const place = post.location.trim();
    if (place && (!coords || (coordsFrom !== undefined && coordsFrom !== place))) {
      const geo = await geocodeLocation(place, post.country);
      if (geo) {
        coords = { lat: geo.lat, lon: geo.lon };
        coordsFrom = place;
        if (!post.country && geo.country) post.country = geo.country;
      }
    }
    post.coords = coords;
    post.coordsFrom = coordsFrom;

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
      info: sanitizeInfo(body.info),
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

  // ---- Newsletter: admin ----
  if (path === '/newsletter' && method === 'GET') {
    const subs = await listSubscribers();
    const published = (await listIndex()).filter((p) => p.status === 'published' && p.slug);
    const sent: Record<string, number> = {};
    if (newsletterEnabled()) for (const p of published) sent[p.id] = await sentCount(p.id);
    return json({
      enabled: newsletterEnabled(),
      fromEmail: process.env.NEWSLETTER_FROM_EMAIL || CONTACT_EMAIL,
      counts: {
        active: subs.filter((x) => x.status === 'active').length,
        pending: subs.filter((x) => x.status === 'pending').length,
        unsubscribed: subs.filter((x) => x.status === 'unsubscribed').length,
      },
      subscribers: subs.map(({ id, email, status, createdAt, confirmedAt }) => ({ id, email, status, createdAt, confirmedAt })),
      posts: published.map((p) => ({ id: p.id, title: p.title, date: p.date })),
      sent,
    });
  }

  if (path === '/newsletter/export' && method === 'GET') {
    return new Response(subscribersCsv(await listSubscribers()), {
      headers: noStoreHeaders({ 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="subscriptors.csv"' }),
    });
  }

  if (path === '/newsletter/send' && method === 'POST') {
    if (!newsletterEnabled()) return json({ error: 'not_configured' }, 400);
    const body = (await request.json()) as { postId?: string; testTo?: string };
    const post = body.postId ? await getPost(String(body.postId)) : null;
    if (!post || post.status !== 'published' || !post.slug) return json({ error: 'post_not_published' }, 400);

    if (body.testTo !== undefined) {
      const to = normalizeEmail(body.testTo);
      if (!to) return json({ error: 'invalid_email' }, 400);
      return json({ ok: await sendEmail(postEmail(post, to)) });
    }
    return json(await sendPostBatch(post, 7000));
  }

  const subscriberMatch = path.match(/^\/newsletter\/subscribers\/([a-f0-9]{24})$/);
  if (subscriberMatch && method === 'DELETE') {
    await deleteSubscriber(subscriberMatch[1]);
    return json({ ok: true });
  }

  if (path === '/stats' && method === 'GET') {
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '30')));
    return json(await getStats(days));
  }

  return json({ error: 'not_found' }, 404);
};
