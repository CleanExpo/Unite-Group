// Shared URL predicates used by every spot that lets user input flow into
// a rendered URL attribute on /portal/[slug]:
//   - brand_config.logo_url             → <img src>  (must be absolute http(s))
//   - nexus_clients.website_url         → <a href>   (must be absolute http(s))
//   - portal_content.quick_links[].href → <a href>   (absolute OR relative path)
//
// Why scheme allow-list:
//   javascript:, data:, vbscript:, and friends are stored-XSS vectors when
//   rendered without an additional escape pass. URL allow-listing at the
//   validator boundary is the most reliable mitigation — blocks the attack
//   class without having to audit every render site.

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * True iff `value` is a non-empty string that parses as a URL with an
 * http: or https: scheme. Used for fields that MUST be absolute (e.g.
 * logo_url loaded from Supabase storage, website_url shown on the index).
 */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    const url = new URL(value);
    return ALLOWED_SCHEMES.has(url.protocol);
  } catch {
    return false;
  }
}

/** True iff `value` is `null`, `undefined`, or an absolute http(s) URL. */
export function isHttpUrlOrNullish(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return isHttpUrl(value);
}

/**
 * True iff `value` is safe to render as an <a href>:
 *   - absolute http(s) URL (delegates to isHttpUrl), OR
 *   - root-relative path that starts with `/` and is NOT a protocol-relative
 *     `//` URL (which would inherit the current scheme and could redirect
 *     off-origin).
 *
 * Permits internal portal navigation like `/proposals/123` while still
 * blocking `javascript:`, `data:`, `//evil.com`, etc.
 */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('//')) return false; // protocol-relative — disallowed
  if (value.startsWith('/')) return true;   // root-relative — same-origin
  return isHttpUrl(value);
}
