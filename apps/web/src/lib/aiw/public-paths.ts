/**
 * AI-Website (AIW) public route surface.
 *
 * `apps/web` is fully founder-gated (see `src/proxy.ts` — the whole app is behind
 * auth + a founder allow-list). The AI-Website product needs exactly two public
 * prefixes on that otherwise-gated app:
 *   - `/aiw`        the public marketing/demo page (also the RAG corpus source)
 *   - `/api/aiw/*`  the public chat / capture / voice endpoints
 *
 * The existing gate matches with a NAIVE prefix (`pathname.startsWith(p)`), which
 * would shadow-expose sibling routes: `startsWith('/aiw')` also matches `/aiwesome`,
 * and `startsWith('/api/aiw')` also matches `/api/aiwatch`. This module provides a
 * BOUNDARY-AWARE matcher so opening the AIW surface cannot de-gate an adjacent route.
 *
 * Wiring note (gated): adding these to the live gate is done by calling
 * `isAiwPublicPath()` inside `proxy.ts`'s `isPublicPath()` — a security-sensitive
 * change that ships with the proxy test in `public-paths.test.ts` proving no other
 * route becomes public.
 */

export const AIW_PUBLIC_PREFIXES = ['/aiw', '/api/aiw'] as const;

/**
 * True only for the AIW public surface. Boundary-safe: matches a prefix exactly or
 * when it is followed by `/`, never as a bare substring (so `/aiwesome` and
 * `/api/aiwatch` stay gated).
 */
export function isAiwPublicPath(pathname: string): boolean {
  return AIW_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}
