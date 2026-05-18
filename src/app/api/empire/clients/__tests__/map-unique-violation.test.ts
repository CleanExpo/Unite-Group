import { mapUniqueViolation } from '../_map-unique-violation';

describe('mapUniqueViolation', () => {
  it('maps 23505 on slug to 409 slug_in_use', () => {
    const out = mapUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "nexus_clients_slug_key"',
      details: 'Key (slug)=(acme) already exists.',
    });
    expect(out).toEqual({ status: 409, body: { error: 'slug_in_use' } });
  });

  it('maps 23505 on contact_email to 409 contact_email_in_use', () => {
    const out = mapUniqueViolation({
      code: '23505',
      message: 'duplicate key value violates unique constraint "nexus_clients_contact_email_key"',
      details: 'Key (contact_email)=(founder@acme.com) already exists.',
    });
    expect(out).toEqual({ status: 409, body: { error: 'contact_email_in_use' } });
  });

  it('returns null for non-23505 errors', () => {
    expect(mapUniqueViolation({ code: '42P01', message: 'no such table' })).toBeNull();
  });

  it('returns null when error is null (no error)', () => {
    expect(mapUniqueViolation(null)).toBeNull();
  });

  it('returns null for 23505 on an unknown column (defensive)', () => {
    expect(
      mapUniqueViolation({
        code: '23505',
        message: 'duplicate key value violates some_other_constraint',
        details: 'Key (something)=(x) already exists.',
      }),
    ).toBeNull();
  });

  it('uses details when message lacks the column name', () => {
    const out = mapUniqueViolation({
      code: '23505',
      message: 'duplicate key',
      details: 'Key (slug)=(acme) already exists.',
    });
    expect(out?.body.error).toBe('slug_in_use');
  });
});
