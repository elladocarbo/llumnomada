import { createHmac, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type { SessionPayload } from './types.mts';
import { LOGIN_LOCKOUT_MS, LOGIN_MAX_FAILS, SESSION_COOKIE, SESSION_TTL_SECONDS } from './config.mts';

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signSession(username: string, secret: string, ttlSeconds = SESSION_TTL_SECONDS): string {
  const payload: SessionPayload = { u: username, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = b64urlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifySession(cookieValue: string | undefined | null, secret: string): SessionPayload | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot === -1) return null;
  const encoded = cookieValue.slice(0, dot);
  const signature = cookieValue.slice(dot + 1);
  const expected = sign(encoded, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(encoded)) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.u !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export function sessionCookieHeader(value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure'); // omitted on plain-http local dev, where a Secure cookie would never be sent
  return parts.join('; ');
}

export function clearSessionCookieHeader(secure: boolean): string {
  const base = `${SESSION_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0`;
  return secure ? `${base}; Secure` : base;
}

export function getSessionFromRequest(request: Request, secret: string): SessionPayload | null {
  const raw = readCookie(request, SESSION_COOKIE);
  return verifySession(raw, secret);
}

export function getClientIp(request: Request, context: { ip?: string }): string {
  if (context?.ip) return context.ip;
  const forwarded = request.headers.get('x-nf-client-connection-ip');
  if (forwarded) return forwarded;
  return '0.0.0.0';
}

interface LockEntry {
  count: number;
  until: number | null;
}

function authStore() {
  return getStore('auth');
}

export async function checkLockout(ip: string): Promise<{ locked: boolean; retryAfterMs: number }> {
  const store = authStore();
  const entry = (await store.get(`fail/${ip}`, { type: 'json' })) as LockEntry | null;
  if (!entry || !entry.until) return { locked: false, retryAfterMs: 0 };
  const remaining = entry.until - Date.now();
  if (remaining > 0) return { locked: true, retryAfterMs: remaining };
  return { locked: false, retryAfterMs: 0 };
}

export async function recordLoginFailure(ip: string): Promise<void> {
  const store = authStore();
  const key = `fail/${ip}`;
  const existing = (await store.get(key, { type: 'json' })) as LockEntry | null;
  // An expired lockout window resets the counter; a still-open one just keeps counting.
  const previousCount = existing && existing.until && existing.until <= Date.now() ? 0 : (existing?.count ?? 0);
  const count = previousCount + 1;
  const entry: LockEntry = {
    count,
    until: count >= LOGIN_MAX_FAILS ? Date.now() + LOGIN_LOCKOUT_MS : null,
  };
  await store.setJSON(key, entry);
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await authStore().delete(`fail/${ip}`);
}
