// Shared website_url validator for /api/empire/clients POST + PATCH.
//
// Spec: must parse with the URL constructor AND use the http or https
// scheme. ≤500 chars (column cap). Empty / whitespace-only / null /
// undefined all resolve to "no value" so the caller can null the column.
//
// Why URL constructor + scheme allow-list rather than a regex:
//   - URL handles every valid edge case (IDN, ports, query strings,
//     hash fragments) the same way the browser will.
//   - Scheme allow-list rejects `javascript:`, `data:`, `file:` etc. —
//     critical because the field is rendered as an <a href> on the
//     portal page and a malicious URL would XSS-via-link if not gated.

export const WEBSITE_MAX = 500;
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

export type WebsiteParseResult =
  | { ok: true; value: string | null }
  | { ok: false };

export function parseWebsiteUrl(input: unknown): WebsiteParseResult {
  if (input === undefined || input === null) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > WEBSITE_MAX) return { ok: false };
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_SCHEMES.has(url.protocol)) return { ok: false };
    return { ok: true, value: trimmed };
  } catch {
    return { ok: false };
  }
}
