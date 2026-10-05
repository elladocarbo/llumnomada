import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { AUTHOR_NAME, CONTACT_EMAIL, SITE, SITE_NAME } from './config.mts';
import { escapeHtml } from './sanitize.mts';
import { compactOldDays } from './hits.mts';
import type { Post } from './types.mts';

// ---------------------------------------------------------------------------------------------
// Subscribers live in the site's own Blobs store; Brevo is only used to *send* mail. A subscriber
// must confirm by clicking a link (double opt-in) before they receive anything.
// ---------------------------------------------------------------------------------------------

export type SubscriberStatus = 'pending' | 'active' | 'unsubscribed';

export interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  /** Secret in the confirmation / unsubscribe links. Renewed on every new subscription request. */
  token: string;
  createdAt: string;
  /** Proof of consent: when it was given and which wording was shown. */
  consentAt: string;
  consentVersion: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  lastConfirmationSentAt?: string;
}

export const CONSENT_VERSION = 'v1';
const CONFIRMATION_COOLDOWN_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function store() {
  return getStore({ name: 'newsletter', consistency: 'strong' });
}

export function normalizeEmail(raw: unknown): string | null {
  const email = String(raw ?? '').trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return null;
  // Deliberately simple and strict: no spaces, quotes, angle brackets or line breaks can get in.
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

export function emailId(email: string): string {
  return createHash('sha256').update(email).digest('hex').slice(0, 24);
}

export function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function getSubscriber(id: string): Promise<Subscriber | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  return (await store().get(`subs/${id}.json`, { type: 'json' })) as Subscriber | null;
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const s = store();
  const { blobs } = await s.list({ prefix: 'subs/' });
  const all = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' }) as Promise<Subscriber | null>));
  return all.filter((x): x is Subscriber => x !== null).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteSubscriber(id: string): Promise<void> {
  if (!/^[a-f0-9]{24}$/.test(id)) return;
  await store().delete(`subs/${id}.json`);
}

/** At most RATE_LIMIT_MAX requests per hour per (hashed) visitor. */
export async function allowRequest(ipHash: string): Promise<boolean> {
  const s = store();
  const key = `rl/${ipHash}`;
  const now = Date.now();
  const recent = (((await s.get(key, { type: 'json' })) as number[] | null) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  await s.setJSON(key, [...recent, now]);
  return true;
}

export function hashVisitor(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:newsletter:${ip}`).digest('hex').slice(0, 24);
}

export interface SubscribeOutcome {
  subscriber: Subscriber;
  /** Whether a confirmation e-mail should be sent now (not for already-active addresses, and not
   *  more than once every few minutes for the same address). */
  sendConfirmation: boolean;
}

export async function requestSubscription(email: string): Promise<SubscribeOutcome> {
  const id = emailId(email);
  const existing = await getSubscriber(id);
  const now = new Date().toISOString();

  if (existing?.status === 'active') return { subscriber: existing, sendConfirmation: false };

  const recentlySent =
    existing?.status === 'pending' &&
    existing.lastConfirmationSentAt &&
    Date.now() - new Date(existing.lastConfirmationSentAt).getTime() < CONFIRMATION_COOLDOWN_MS;
  if (existing && recentlySent) return { subscriber: existing, sendConfirmation: false };

  const subscriber: Subscriber = {
    id,
    email,
    status: 'pending',
    token: randomBytes(24).toString('hex'),
    createdAt: existing?.createdAt ?? now,
    consentAt: now,
    consentVersion: CONSENT_VERSION,
    lastConfirmationSentAt: now,
  };
  await store().setJSON(`subs/${id}.json`, subscriber);
  return { subscriber, sendConfirmation: true };
}

export async function confirmSubscription(id: string, token: string): Promise<boolean> {
  const sub = await getSubscriber(id);
  if (!sub || !tokensMatch(sub.token, token)) return false;
  if (sub.status !== 'active') {
    await store().setJSON(`subs/${id}.json`, { ...sub, status: 'active', confirmedAt: new Date().toISOString(), unsubscribedAt: undefined });
  }
  return true;
}

export async function unsubscribe(id: string, token: string): Promise<boolean> {
  const sub = await getSubscriber(id);
  if (!sub || !tokensMatch(sub.token, token)) return false;
  if (sub.status !== 'unsubscribed') {
    await store().setJSON(`subs/${id}.json`, { ...sub, status: 'unsubscribed', unsubscribedAt: new Date().toISOString() });
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// Sending (Brevo transactional API: one personalised message per recipient)
// ---------------------------------------------------------------------------------------------

function sender() {
  return {
    name: process.env.NEWSLETTER_FROM_NAME || SITE_NAME,
    email: process.env.NEWSLETTER_FROM_EMAIL || CONTACT_EMAIL,
  };
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string;
  /** Replies go here instead of the (unmonitored by default) sending address. */
  replyTo?: string;
}

export async function sendEmail(mail: OutgoingEmail): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return false;
  const headers: Record<string, string> = {};
  if (mail.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${mail.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
        ...(Object.keys(headers).length ? { headers } : {}),
        ...(mail.replyTo ? { replyTo: { email: mail.replyTo } } : {}),
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function unsubscribeLink(sub: Subscriber): string {
  return `${SITE}/newsletter/baixa/?id=${sub.id}&t=${sub.token}`;
}

function oneClickUnsubscribeUrl(sub: Subscriber): string {
  return `${SITE}/api/newsletter/unsubscribe?id=${sub.id}&t=${sub.token}`;
}

const INK = '#1e211c';
const GOLD = '#a07c33';
const PARCHMENT = '#ede6d6';

function frame(inner: string, footer: string): string {
  return `<!doctype html><html lang="ca"><body style="margin:0;padding:0;background:${PARCHMENT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PARCHMENT};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fbf7ee;border:1px solid #d8cfb8;">
<tr><td style="padding:22px 28px 6px;font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};">${escapeHtml(SITE_NAME)}</td></tr>
<tr><td style="padding:6px 28px 26px;font-family:Georgia,serif;font-size:17px;line-height:1.6;color:${INK};">${inner}</td></tr>
<tr><td style="padding:16px 28px 22px;border-top:1px solid #e3dcc9;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#7a766a;">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:22px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:${INK};color:#fbf7ee;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(label)}</a></p>`;
}

export function confirmationEmail(sub: Subscriber): OutgoingEmail {
  const url = `${SITE}/api/newsletter/confirm?id=${sub.id}&t=${sub.token}`;
  return {
    to: sub.email,
    subject: `Confirma la teva subscripció a ${SITE_NAME}`,
    html: frame(
      `<p style="margin:0 0 12px;">Hola!</p><p style="margin:0 0 12px;">Algú (esperem que tu) ha demanat rebre els relats nous de ${escapeHtml(SITE_NAME)} en aquest correu. Per confirmar-ho, prem el botó:</p>${button(url, 'Confirma la subscripció')}<p style="margin:0;font-size:14px;color:#5b584d;">Si no ho has demanat tu, ignora aquest missatge i no rebràs res.</p>`,
      `Aquest missatge s'envia una sola vegada per confirmar la teva adreça. ${escapeHtml(SITE_NAME)} · ${escapeHtml(CONTACT_EMAIL)}`,
    ),
    text: `Confirma la teva subscripció a ${SITE_NAME}: ${url}\n\nSi no ho has demanat tu, ignora aquest missatge i no rebràs res.`,
  };
}

function plain(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function coverUrl(cover: string): string {
  if (!cover) return '';
  if (/^\/img\/[a-zA-Z0-9-]{1,100}$/.test(cover)) return `${SITE}/.netlify/images?url=${encodeURIComponent(cover)}&w=1000&fm=jpg&q=80`;
  return cover.startsWith('http') ? cover : `${SITE}${cover}`;
}

/** The e-mail for one published relat. `sub` is undefined for the test message sent to the author. */
export function postEmail(post: Post, to: string, sub?: Subscriber): OutgoingEmail {
  const url = `${SITE}/blog/${post.slug}/`;
  const cover = coverUrl(post.cover);
  const inner = `${cover ? `<p style="margin:0 0 18px;"><a href="${escapeHtml(url)}"><img src="${escapeHtml(cover)}" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;"></a></p>` : ''}
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:normal;color:${INK};">${escapeHtml(post.title)}</h1>
<p style="margin:0;">${post.lead}</p>${button(url, 'Llegeix el relat')}`;
  const footer = sub
    ? `Reps aquest correu perquè t'has subscrit a ${escapeHtml(SITE_NAME)}. <a href="${escapeHtml(unsubscribeLink(sub))}" style="color:#7a766a;">Dona't de baixa</a> quan vulguis. · ${escapeHtml(CONTACT_EMAIL)}`
    : `Aquesta és una prova: les persones subscrites hi veuran l'enllaç per donar-se de baixa. · ${escapeHtml(CONTACT_EMAIL)}`;
  return {
    to,
    subject: post.title,
    html: frame(inner, footer),
    text: `${post.title}\n\n${plain(post.lead)}\n\nLlegeix el relat: ${url}${sub ? `\n\nPer donar-te de baixa: ${unsubscribeLink(sub)}` : ''}`,
    unsubscribeUrl: sub ? oneClickUnsubscribeUrl(sub) : undefined,
  };
}

// --- sending a relat to the whole list, in resumable batches -------------------------------------

export async function sentCount(postId: string): Promise<number> {
  const { blobs } = await store().list({ prefix: `sent/${postId}/` });
  return blobs.length;
}

export interface BatchResult {
  sent: number;
  failed: number;
  /** Active subscribers that have not received this relat yet. */
  remaining: number;
  total: number;
}

/** Sends `post` to active subscribers who haven't got it yet, for at most `budgetMs`. Calling it
 *  again continues where it stopped (each delivery is recorded), so a relat is never sent twice. */
export async function sendPostBatch(post: Post, budgetMs: number): Promise<BatchResult> {
  const s = store();
  const started = Date.now();
  const active = (await listSubscribers()).filter((x) => x.status === 'active');
  const { blobs } = await s.list({ prefix: `sent/${post.id}/` });
  const done = new Set(blobs.map((b) => b.key.split('/').pop()));
  const todo = active.filter((x) => !done.has(x.id));

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < todo.length && Date.now() - started < budgetMs; i += 4) {
    const chunk = todo.slice(i, i + 4);
    const results = await Promise.all(
      chunk.map(async (sub) => {
        const ok = await sendEmail(postEmail(post, sub.email, sub));
        if (ok) await s.set(`sent/${post.id}/${sub.id}`, new Date().toISOString());
        return ok;
      }),
    );
    for (const ok of results) ok ? sent++ : failed++;
    if (failed >= 8) break; // something is wrong (key, sender, daily limit): stop instead of hammering
  }
  return { sent, failed, remaining: todo.length - sent, total: active.length };
}

// --- personal invitations ("Convida") -------------------------------------------------------------
// A single, one-off message to someone the author knows, pointing to the public sign-up page. The
// recipient still has to subscribe (and confirm) on their own. Only a one-way hash of the address
// is kept, to never invite the same person twice; addresses are not stored.

export const INVITE_DAILY_LIMIT = 20;
export const INVITE_BATCH_LIMIT = 10;

export function invitationEmail(to: string, note: string): OutgoingEmail {
  const url = `${SITE}/newsletter/`;
  const safeNote = note.trim().slice(0, 400);
  const noteHtml = safeNote ? `<p style="margin:0 0 14px;padding:10px 14px;border-left:3px solid ${GOLD};font-style:italic;">${escapeHtml(safeNote).replace(/\n/g, '<br>')}</p>` : '';
  return {
    to,
    subject: `${AUTHOR_NAME} et convida a ${SITE_NAME}`,
    html: frame(
      `<p style="margin:0 0 12px;">Hola!</p><p style="margin:0 0 12px;">Sóc ${escapeHtml(AUTHOR_NAME)}, i escric ${escapeHtml(SITE_NAME)}, un blog de viatges. T’escric per convidar-te a rebre els relats nous per correu quan els publiqui.</p>${noteHtml}${button(url, 'Vull subscriure’m')}<p style="margin:0;font-size:14px;color:#5b584d;">No t’has subscrit encara: només ho estaràs si fas clic al botó i confirmes la teva adreça.</p>`,
      `Aquest és un missatge únic, enviat personalment per ${escapeHtml(AUTHOR_NAME)}. Si no t’interessa, ignora’l: no et tornaré a escriure. Pots respondre a aquest correu. · ${escapeHtml(CONTACT_EMAIL)}`,
    ),
    text: `Hola! Sóc ${AUTHOR_NAME}, i escric ${SITE_NAME}, un blog de viatges. Et convido a rebre els relats nous per correu.${safeNote ? `\n\n"${safeNote}"` : ''}\n\nPer subscriure't: ${url}\n\nAquest és un missatge únic; si no t'interessa, ignora'l: no et tornaré a escriure.`,
    replyTo: process.env.NEWSLETTER_FROM_EMAIL || CONTACT_EMAIL,
  };
}

export type InviteResult = 'sent' | 'invalid' | 'already_subscribed' | 'already_invited' | 'daily_limit' | 'failed';

/** Invites each address (at most INVITE_BATCH_LIMIT per call and INVITE_DAILY_LIMIT per day). */
export async function inviteAddresses(rawEmails: string[], note: string): Promise<Array<{ email: string; result: InviteResult }>> {
  const s = store();
  const day = new Date().toISOString().slice(0, 10);
  const counterKey = `invite-day/${day}`;
  let usedToday = Number((await s.get(counterKey)) ?? '0') || 0;

  const out: Array<{ email: string; result: InviteResult }> = [];
  const seen = new Set<string>();
  for (const raw of rawEmails.slice(0, INVITE_BATCH_LIMIT)) {
    const email = normalizeEmail(raw);
    if (!email) {
      out.push({ email: String(raw).slice(0, 80), result: 'invalid' });
      continue;
    }
    const id = emailId(email);
    if (seen.has(id)) continue;
    seen.add(id);

    // Anyone already on the list — including people who unsubscribed — is never invited.
    if (await getSubscriber(id)) {
      out.push({ email, result: 'already_subscribed' });
      continue;
    }
    if ((await s.get(`invited/${id}`)) !== null) {
      out.push({ email, result: 'already_invited' });
      continue;
    }
    if (usedToday >= INVITE_DAILY_LIMIT) {
      out.push({ email, result: 'daily_limit' });
      continue;
    }
    const ok = await sendEmail(invitationEmail(email, note));
    if (ok) {
      usedToday++;
      await s.set(`invited/${id}`, new Date().toISOString());
      await s.set(counterKey, String(usedToday));
    }
    out.push({ email, result: ok ? 'sent' : 'failed' });
  }
  return out;
}

// --- housekeeping -------------------------------------------------------------------------------

export const PENDING_MAX_AGE_DAYS = 30;

/** Deletes sign-ups that were never confirmed within PENDING_MAX_AGE_DAYS, plus expired rate-limit
 *  records. Safe to call often; `maybeRunDailyCleanup` makes it run once a day. */
export async function purgeStale(): Promise<{ pendingRemoved: number; rateRecordsRemoved: number }> {
  const s = store();
  const cutoff = Date.now() - PENDING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let pendingRemoved = 0;
  for (const sub of await listSubscribers()) {
    if (sub.status === 'pending' && new Date(sub.createdAt).getTime() < cutoff) {
      await s.delete(`subs/${sub.id}.json`);
      pendingRemoved++;
    }
  }

  let rateRecordsRemoved = 0;
  const { blobs } = await s.list({ prefix: 'rl/' });
  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const b of blobs) {
    const times = ((await s.get(b.key, { type: 'json' })) as number[] | null) ?? [];
    if (!times.some((t) => t > windowStart)) {
      await s.delete(b.key);
      rateRecordsRemoved++;
    }
  }
  return { pendingRemoved, rateRecordsRemoved };
}

export async function maybeRunDailyCleanup(): Promise<boolean> {
  const s = store();
  const today = new Date().toISOString().slice(0, 10);
  if ((await s.get('cleanup/last')) === today) return false;
  await s.set('cleanup/last', today);
  await purgeStale();
  await compactOldDays();
  return true;
}

export function subscribersCsv(subs: Subscriber[]): string {
  const cell = (v: string) => {
    // Neutralise spreadsheet formulas in user-supplied text.
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = subs.map((x) => [x.email, x.status, x.createdAt, x.confirmedAt ?? '', x.unsubscribedAt ?? ''].map(cell).join(','));
  return ['email,estat,alta,confirmat,baixa', ...rows].join('\r\n');
}
