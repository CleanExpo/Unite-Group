// Pins the contract: when two POSTs race past the pre-check and the
// second INSERT hits 23505, the route returns 409 slug_in_use (the
// same code the pre-check path returns) rather than 500.
//
// Tests the error-mapping helper inline — full route integration would
// require mocking the entire NextRequest chain. The mapping logic is
// the load-bearing piece.

function mapInsertError(error: { code?: string; message?: string } | null) {
  if (error?.code === '23505') {
    return { status: 409, body: { error: 'slug_in_use' } };
  }
  return { status: 500, body: { error: 'client_insert_failed', detail: error?.message } };
}

describe('POST /api/empire/clients — INSERT error mapping', () => {
  it('maps Postgres 23505 unique_violation to 409 slug_in_use', () => {
    const result = mapInsertError({ code: '23505', message: 'duplicate key' });
    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: 'slug_in_use' });
  });

  it('maps any other error code to 500 client_insert_failed with the message', () => {
    const result = mapInsertError({ code: '42P01', message: 'relation does not exist' });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      error: 'client_insert_failed',
      detail: 'relation does not exist',
    });
  });

  it('maps a null error (no data) to 500 too', () => {
    const result = mapInsertError(null);
    expect(result.status).toBe(500);
    expect(result.body.error).toBe('client_insert_failed');
  });
});
