import { describe, it, expect, afterEach } from 'vitest';
import { POST } from './route';

function post(body: unknown) {
  return POST(new Request('http://localhost/api/frontdesk/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  }));
}

describe('POST /api/frontdesk/chat — ships dark', () => {
  afterEach(() => {
    delete process.env.UNITE_FRONT_DESK_ENABLED;
  });

  it('404s when the flag is off (default)', async () => {
    const res = await post({ message: 'hi' });
    expect(res.status).toBe(404);
  });

  it('does not answer even when enabled until provisioned (never a fake reply)', async () => {
    process.env.UNITE_FRONT_DESK_ENABLED = 'true';
    const res = await post({ message: 'hi' });
    expect(res.status).toBe(503);
  });

  it('400s on an empty message when enabled', async () => {
    process.env.UNITE_FRONT_DESK_ENABLED = 'true';
    const res = await post({ message: '   ' });
    expect(res.status).toBe(400);
  });
});
