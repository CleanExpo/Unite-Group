// Maps a Postgres 23505 (unique_violation) error from nexus_clients into
// a column-aware response code so the wizard / edit form can render a
// specific message instead of a generic 500.
//
// Postgres returns the violated constraint in the message (varies by
// driver / connection string) and the column in the `details` field. We
// match against the column name to be driver-agnostic.

export interface UniqueViolationMapping {
  status: 409;
  body: { error: 'slug_in_use' | 'contact_email_in_use' };
}

/** Returns a mapping if the error is a 23505 on a known UNIQUE column. */
export function mapUniqueViolation(
  error: { code?: string; message?: string; details?: string } | null,
): UniqueViolationMapping | null {
  if (!error || error.code !== '23505') return null;
  const haystack = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

  // Order matters when both substrings could match (won't happen with current
  // schema, but the slug check is more specific so it goes first).
  if (haystack.includes('slug')) {
    return { status: 409, body: { error: 'slug_in_use' } };
  }
  if (haystack.includes('contact_email')) {
    return { status: 409, body: { error: 'contact_email_in_use' } };
  }
  return null;
}
