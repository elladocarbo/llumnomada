export interface GeoResult {
  lat: number;
  lon: number;
  /** Country name in Catalan, when the service returns one. */
  country?: string;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
// OpenStreetMap's usage policy asks for an identifying User-Agent and at most one request/second.
const USER_AGENT = 'LlumNomada-blog/1.0 (hola@llumnomada.com)';
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 4000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Search texts to try, most specific first. "Marràkech i Merzouga, Marroc" can't be found as
 *  a whole, so the first place of a list ("A i B", "A / B") is tried with the rest of the text,
 *  and the country alone is the last resort. */
export function locationCandidates(location: string, country?: string): string[] {
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return country?.trim() ? [country.trim()] : [];
  const rest = parts.slice(1).join(', ');
  const firstPlace = parts[0].split(/\s+(?:i|y|and)\s+|\s*\/\s*/i)[0].trim();

  const out = [location.trim()];
  if (firstPlace && firstPlace !== parts[0]) out.push(rest ? `${firstPlace}, ${rest}` : firstPlace);
  if (country?.trim()) out.push(country.trim());
  else if (rest) out.push(parts[parts.length - 1]);
  return [...new Set(out)].slice(0, MAX_ATTEMPTS);
}

async function search(query: string): Promise<GeoResult | null> {
  const url = `${ENDPOINT}?${new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', addressdetails: '1', 'accept-language': 'ca' })}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string; address?: { country?: string } }>;
    const row = rows[0];
    const lat = Number(row?.lat);
    const lon = Number(row?.lon);
    if (!row || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4, country: row.address?.country };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Looks up one named place ("Glendalough") for a relat, using its country to disambiguate. Unlike
 *  geocodeLocation it never falls back to the country alone: a pin in the middle of the country
 *  would be wrong, so "not found" is returned instead. */
export async function geocodePlace(name: string, country?: string): Promise<GeoResult | null> {
  const tries = country?.trim() ? [`${name}, ${country.trim()}`, name] : [name];
  for (let i = 0; i < tries.length; i++) {
    if (i > 0) await sleep(1100);
    const found = await search(tries[i]);
    if (found) return found;
  }
  return null;
}

/** Looks a place name up on OpenStreetMap (Nominatim). Returns null when nothing is found or the
 *  service is unreachable — callers must treat that as "no automatic position", never as an error. */
export async function geocodeLocation(location: string, country?: string): Promise<GeoResult | null> {
  const candidates = locationCandidates(location, country);
  for (let i = 0; i < candidates.length; i++) {
    if (i > 0) await sleep(1100);
    const found = await search(candidates[i]);
    if (found) return found;
  }
  return null;
}
