// Pure helpers (unit-testable, no I/O).
import type { RlsContext } from '../types/database.js';

/** Format a JS number[] as a pgvector literal: [0.1,0.2,0.3]. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

/** Build the request.jwt.claims payload for an RLS-scoped transaction. */
export function buildClaims(ctx: RlsContext): string {
  return JSON.stringify({ app_metadata: { org_id: ctx.orgId, person_id: ctx.personId } });
}
