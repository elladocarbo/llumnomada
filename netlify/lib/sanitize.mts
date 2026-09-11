const ALLOWED_TAG = /<\/?(strong|em|br)\s*\/?>/gi;
const MAX_LENGTH = 20000;

/** Escapes everything — used for fields that must never contain markup (titles, categories, refs, location). */
export function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allowlist sanitizer for rich-text block content: only <strong>, <em> and <br> survive,
 * always without attributes. Everything else — including any other tag or a smuggled
 * attribute on an allowed tag — is escaped to inert text. Authoritative: runs server-side
 * on every write, the client's own formatting is never trusted.
 */
export function sanitizeRichText(input: string): string {
  const trimmed = String(input ?? '').slice(0, MAX_LENGTH);

  // \0-delimited markers: a byte sequence normal input can't contain and escapeHtml won't
  // touch, so literal user text can never collide with a placeholder.
  const tokens: string[] = [];
  const withPlaceholders = trimmed.replace(ALLOWED_TAG, (match) => {
    const tag = match.toLowerCase().replace(/\s+/g, '').replace('/>', '>');
    let canonical: string;
    if (tag === '<strong>') canonical = '<strong>';
    else if (tag === '</strong>') canonical = '</strong>';
    else if (tag === '<em>') canonical = '<em>';
    else if (tag === '</em>') canonical = '</em>';
    else canonical = '<br>';
    tokens.push(canonical);
    return `\0${tokens.length - 1}\0`;
  });

  const escaped = escapeHtml(withPlaceholders);

  return escaped.replace(/\0(\d+)\0/g, (_m, idx) => tokens[Number(idx)] ?? '');
}
