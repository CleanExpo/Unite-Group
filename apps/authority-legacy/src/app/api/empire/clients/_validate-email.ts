// Shared email validator for /api/empire/clients POST + PATCH.
//
// Not RFC 5322 — that regex is enormous and rejects valid-but-rare addresses.
// Pragmatic shape: <local>@<host>.<tld>, max 250 chars (the column cap).
// Catches typos like "garbage", "foo@", "@bar.com", "x@y" while letting
// every reasonable address through.

export const EMAIL_MAX = 250;

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export type EmailParseResult =
  | { ok: true; value: string | null }
  | { ok: false };

/**
 * Parse an incoming contact_email field. Accepts:
 *   - undefined → returns { ok: true, value: null }  (caller treats as "no change")
 *   - null      → returns { ok: true, value: null }
 *   - empty str → returns { ok: true, value: null }
 *   - valid str → returns { ok: true, value: trimmed }
 * Rejects strings that don't match EMAIL_RE or exceed EMAIL_MAX.
 *
 * Callers should distinguish `undefined` from explicit null themselves —
 * this helper only narrows the value when the field is present.
 */
export function parseContactEmail(input: unknown): EmailParseResult {
  if (input === undefined || input === null) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > EMAIL_MAX) return { ok: false };
  if (!EMAIL_RE.test(trimmed)) return { ok: false };
  return { ok: true, value: trimmed };
}
