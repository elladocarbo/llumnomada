import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { CONTACT_EMAIL, SITE, SITE_NAME } from './config.mts';
import { escapeHtml } from './sanitize.mts';
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

export function subscribersCsv(subs: Subscriber[]): string {
  const cell = (v: string) => {
    // Neutralise spreadsheet formulas in user-supplied text.
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = subs.map((x) => [x.email, x.status, x.createdAt, x.confirmedAt ?? '', x.unsubscribedAt ?? ''].map(cell).join(','));
  return ['email,estat,alta,confirmat,baixa', ...rows].join('\r\n');
}
