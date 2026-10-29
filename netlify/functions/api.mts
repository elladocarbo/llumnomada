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
import { deletePost, getPost, listIndex, getSettings, newPostId, saveSettings, savePost, saveTranslations } from '../lib/store.mts';
import { sanitizeRichText } from '../lib/sanitize.mts';
import { renderNewsletterPage, renderPreview } from '../lib/html.mts';
import { purgeBlogCache, noStoreHeaders } from '../lib/cache.mts';
import { getStats } from '../lib/hits.mts';
import { castVote } from '../lib/ratings.mts';
import { geocodeLocation, geocodePlace } from '../lib/geocode.mts';
import type { Block, Coords, Place, Post, PostInfo, PostTranslation, Settings } from '../lib/types.mts';
import { isLang, lp, TRANS_LANGS, type Lang } from '../lib/i18n.mts';
import { CONTACT_EMAIL, LANG_PREVIEW_COOKIE, SESSION_TTL_SECONDS } from '../lib/config.mts';
import { newsletterEnabled } from '../lib/newsletter-config.mts';
import {
  allowRequest,
  confirmSubscription,
  confirmationEmail,
  deleteSubscriber,
  subscriberLang,
  hashVisitor,
  INVITE_BATCH_LIMIT,
  INVITE_DAILY_LIMIT,
  inviteAddresses,
  getSubscriber,
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

const COORD_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/;
const MAX_PLACES = 30;
const MAX_LOOKUPS_PER_SAVE = 5; // each lookup waits ~1s (OpenStreetMap's rate limit): keep a save well under the time limit

function placeName(raw: unknown): string {
  return String(raw ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function validCoords(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Turns the panel's "one place per line" text into places. A line is "Name" (looked up on
 *  OpenStreetMap, at most MAX_LOOKUPS_PER_SAVE per save; the rest are retried on the next save) or
 *  "Name | lat, lon" (typed by hand, never overwritten). Positions found earlier are reused. */
async function resolvePlaces(text: string, existing: Place[] | undefined, country?: string, maxLookups = MAX_LOOKUPS_PER_SAVE): Promise<Place[] | undefined> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_PLACES);
  if (!lines.length) return undefined;
  const out: Place[] = [];
  let lookups = 0;
  for (const line of lines) {
    const [rawName, rawCoords] = line.split('|');
    const name = placeName(rawName);
    if (!name) continue;

    const typed = rawCoords ? COORD_PAIR.exec(rawCoords) : null;
    if (typed && validCoords(Number(typed[1]), Number(typed[2]))) {
      out.push({ name, lat: Number(typed[1]), lon: Number(typed[2]), manual: true });
      continue;
    }
    const known = existing?.find((e) => e.name === name && !e.manual && e.lat !== undefined && e.lon !== undefined);
    if (known) {
      out.push({ name, lat: known.lat, lon: known.lon });
      continue;
    }
    if (lookups < maxLookups) {
      if (lookups > 0) await new Promise((r) => setTimeout(r, 1100));
      lookups++;
      const geo = await geocodePlace(name, country);
      if (geo) {
        out.push({ name, lat: geo.lat, lon: geo.lon });
        continue;
      }
    }
    out.push({ name });
  }
  return out;
}

/** For scripts that send an already-structured list. */
function sanitizePlaceList(v: unknown[]): Place[] | undefined {
  const out: Place[] = [];
  for (const item of v.slice(0, MAX_PLACES)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name = placeName(o.name);
    if (!name) continue;
    const lat = Number(o.lat);
    const lon = Number(o.lon);
    out.push(validCoords(lat, lon) ? { name, lat, lon, ...(o.manual ? { manual: true } : {}) } : { name });
  }
  return out.length ? out : undefined;
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

  // The sign-up and unsubscribe forms say which language they were sent from, so the answer page comes back in it.
  const langOf = (v: unknown): Lang => (isLang(v) ? v : 'ca');
  const nlPage = (lang: Lang, kind: string) => seeOther(lp(lang, `/newsletter/${kind}/`));

  if (path === '/newsletter/subscribe' && method === 'POST') {
    if (!newsletterEnabled()) return nlPage('ca', 'no-disponible');
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return nlPage('ca', 'error');
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return nlPage('ca', 'error');
    }
    const lang = langOf(form.get('lang'));
    if (String(form.get('website') ?? '')) return nlPage(lang, 'revisa'); // honeypot: bots fill it
    const email = normalizeEmail(form.get('email'));
    const secret = process.env.SESSION_SECRET;
    if (!email || form.get('consent') !== '1' || !secret) return nlPage(lang, 'error');
    if (!(await allowRequest(hashVisitor(getClientIp(request, context), secret)))) return nlPage(lang, 'error');

    const { subscriber, sendConfirmation } = await requestSubscription(email, lang);
    if (sendConfirmation && !(await sendEmail(confirmationEmail(subscriber)))) return nlPage(lang, 'error');
    // Same answer whether or not the address was already subscribed, so it can't be probed.
    return nlPage(lang, 'revisa');
  }

  if (path === '/newsletter/confirm' && method === 'GET') {
    const subId = url.searchParams.get('id') ?? '';
    const ok = await confirmSubscription(subId, url.searchParams.get('t') ?? '');
    // The answer comes in the language the person signed up in (if that language is open).
    const subLang = ok ? subscriberLang((await getSubscriber(subId))!) : 'ca';
    const open: Lang[] = ['ca', ...((await getSettings()).languages ?? [])];
    const pageLang: Lang = open.includes(subLang) ? subLang : 'ca';
    // Answered in place (not redirected): the platform would copy this URL's query — which holds the
    // secret token — onto the redirect target.
    return new Response(renderNewsletterPage(ok ? 'confirmat' : 'error', {}, { lang: pageLang, langs: open }), {
      status: ok ? 200 : 400,
      headers: noStoreHeaders({ 'content-type': 'text/html; charset=utf-8' }),
    });
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
      let lang: Lang = 'ca';
      try {
        const form = await request.formData();
        id = String(form.get('id') ?? id);
        token = String(form.get('t') ?? token);
        lang = langOf(form.get('lang'));
      } catch {
        // one-click POSTs carry the ids in the query string
      }
      const ok = await unsubscribe(id, token);
      if ((request.headers.get('accept') ?? '').includes('text/html')) return nlPage(lang, ok ? 'baixa-feta' : 'error');
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
    const current = await getSettings();
    const settings: Settings = {
      // The panel's settings form doesn't know about languages: keep them unless they are sent.
      languages: body.languages === undefined ? current.languages : (Array.isArray(body.languages) ? body.languages.filter((l): l is 'es' | 'en' => (TRANS_LANGS as string[]).includes(l)) : []),
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
      // Translations are edited through their own endpoints: saving the Catalan text never wipes them.
      translations: existing?.translations,
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

    // Series: undefined keeps the stored value (scripts that re-save without these fields), an
    // empty value clears it, anything else is validated.
    const cleanText = (v: unknown, max: number): string | undefined => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) || undefined;
    post.series = body.series === undefined ? existing?.series : cleanText(body.series, 120);
    post.seriesLabel = body.seriesLabel === undefined ? existing?.seriesLabel : cleanText(body.seriesLabel, 80);
    if (body.seriesOrder === undefined) {
      post.seriesOrder = existing?.seriesOrder;
    } else {
      const n = Number(body.seriesOrder);
      post.seriesOrder = String(body.seriesOrder ?? '').trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 99 ? n : undefined;
    }
    if (!post.series) {
      post.seriesOrder = undefined;
      post.seriesLabel = undefined;
    }

    // Places visited: the panel sends 'placesText' (lines); scripts may send a 'places' array;
    // sending neither keeps what is stored.
    const rawBody = body as Record<string, unknown>;
    if (rawBody.placesText !== undefined) {
      post.places = await resolvePlaces(String(rawBody.placesText), existing?.places, post.country);
    } else if (Array.isArray(rawBody.places)) {
      post.places = sanitizePlaceList(rawBody.places);
    } else {
      post.places = existing?.places;
    }

    const saved = await savePost(post);
    await purgeBlogCache();
    return json(saved);
  }

  // ---- Translations of a relat: /posts/<id>/translations/<es|en> ----
  // PUT saves (as a draft unless told otherwise), PATCH changes the status, DELETE removes it.
  // The translated blocks must line up one by one with the Catalan ones (same kinds, same order).
  const trMatch = path.match(/^\/posts\/([^/]+)\/translations\/(es|en)$/);
  if (trMatch) {
    const post = await getPost(trMatch[1]);
    if (!post) return json({ error: 'not_found' }, 404);
    const lang = trMatch[2] as 'es' | 'en';
    const all = { ...(post.translations ?? {}) };
    if (method === 'GET') return json(all[lang] ?? null);
    if (method === 'DELETE') {
      delete all[lang];
      await saveTranslations(post.id, all);
      return json({ ok: true });
    }
    if (method === 'PATCH') {
      const body = (await request.json()) as { status?: string };
      const current = all[lang];
      if (!current) return json({ error: 'no_translation' }, 404);
      all[lang] = { ...current, status: body.status === 'published' ? 'published' : 'draft' };
      await saveTranslations(post.id, all);
      return json({ ok: true, status: all[lang]!.status });
    }
    if (method === 'PUT') {
      const body = (await request.json()) as Partial<PostTranslation>;
      const blocks = sanitizeBlocks(body.blocks);
      const mismatch = blocks.length !== post.blocks.length || blocks.some((b, i) => (b.t === 'img') !== (post.blocks[i].t === 'img') || (b.t === 'img' && b.h !== post.blocks[i].h));
      if (mismatch) return json({ error: 'block_mismatch', expected: post.blocks.length, got: blocks.length }, 400);
      const clean = (v: unknown, max: number): string | undefined => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) || undefined;
      const tr: PostTranslation = {
        status: body.status === 'published' ? 'published' : (all[lang]?.status ?? 'draft'),
        title: clean(body.title, 200) ?? post.title,
        lead: sanitizeRichText(String(body.lead ?? '')),
        blocks,
        location: clean(body.location, 200),
        refs: body.refs === undefined ? undefined : sanitizeStringArray(body.refs, 500),
        info: sanitizeInfo(body.info),
        series: clean(body.series, 120),
        seriesLabel: clean(body.seriesLabel, 80),
        updated: new Date().toISOString(),
      };
      all[lang] = tr;
      await saveTranslations(post.id, all);
      return json({ ok: true, status: tr.status });
    }
  }

  // Opens (or closes, with ?off=1) the author's preview of the translations that are not public yet:
  // a cookie valid for the whole site, so /es/ and /en/ show every translation, drafts included.
  if (path === '/lang-preview' && method === 'GET') {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return json({ error: 'server_not_configured' }, 500);
    const off = url.searchParams.get('off') === '1';
    const value = off ? '' : signSession(auth.u, secret, 24 * 3600);
    const cookie = [`${LANG_PREVIEW_COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${off ? 0 : 24 * 3600}`, ...(url.protocol === 'https:' ? ['Secure'] : [])].join('; ');
    const lang = isLang(url.searchParams.get('lang')) ? (url.searchParams.get('lang') as Lang) : 'es';
    return new Response(null, { status: 303, headers: noStoreHeaders({ location: off ? '/' : lp(lang, '/'), 'set-cookie': cookie }) });
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
    // Places as typed in the panel: lines with coordinates, or names already located on the saved
    // post, are drawn on the map; new names would need a lookup, which only saving does.
    const previewPlaces = (body as Record<string, unknown>).placesText !== undefined
      ? await resolvePlaces(String((body as Record<string, unknown>).placesText), body.id ? (await getPost(String(body.id)))?.places : undefined, undefined, 0)
      : undefined;
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
      places: previewPlaces,
      series: body.series ? String(body.series).replace(/[<>]/g, '').slice(0, 120) : undefined,
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
      subscribers: subs.map((x) => ({ id: x.id, email: x.email, status: x.status, createdAt: x.createdAt, confirmedAt: x.confirmedAt, lang: subscriberLang(x) })),
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
    const body = (await request.json()) as { postId?: string; testTo?: string; lang?: string };
    const post = body.postId ? await getPost(String(body.postId)) : null;
    if (!post || post.status !== 'published' || !post.slug) return json({ error: 'post_not_published' }, 400);
    const openLangs: Lang[] = ['ca', ...((await getSettings()).languages ?? [])];

    if (body.testTo !== undefined) {
      const to = normalizeEmail(body.testTo);
      if (!to) return json({ error: 'invalid_email' }, 400);
      return json({ ok: await sendEmail(postEmail(post, to, undefined, openLangs, langOf(body.lang))) });
    }
    return json(await sendPostBatch(post, 7000, openLangs));
  }

  if (path === '/newsletter/invite' && method === 'POST') {
    if (!newsletterEnabled()) return json({ error: 'not_configured' }, 400);
    const body = (await request.json()) as { emails?: unknown; note?: unknown; knowsThem?: unknown; lang?: unknown };
    if (body.knowsThem !== true) return json({ error: 'confirmation_required' }, 400);
    const emails = Array.isArray(body.emails) ? body.emails.map((e) => String(e)) : [];
    if (!emails.length) return json({ error: 'no_emails' }, 400);
    return json({
      results: await inviteAddresses(emails, String(body.note ?? ''), ['ca', ...((await getSettings()).languages ?? [])].includes(langOf(body.lang)) ? langOf(body.lang) : 'ca'),
      dailyLimit: INVITE_DAILY_LIMIT,
      batchLimit: INVITE_BATCH_LIMIT,
    });
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
