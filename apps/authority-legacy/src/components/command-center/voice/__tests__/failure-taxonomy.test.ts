import { mapMargotFailure } from '../failure-taxonomy';

describe('mapMargotFailure', () => {
  it('maps 401 to unauthorized with sign-in next action', () => {
    const r = mapMargotFailure(401, 'unauthorized');
    expect(r.category).toBe('unauthorized');
    expect(r.title).toMatch(/sign in/i);
    expect(r.nextAction).toMatch(/sign in/i);
  });

  it('maps 403 forbidden to switch-account next action', () => {
    const r = mapMargotFailure(403, 'forbidden');
    expect(r.category).toBe('forbidden');
    expect(r.nextAction).toMatch(/admin account/i);
  });

  it('maps 429 rate_limited to wait-and-retry next action', () => {
    const r = mapMargotFailure(429, 'rate_limited');
    expect(r.category).toBe('rate_limited');
    expect(r.nextAction).toMatch(/wait/i);
  });

  it('maps 503 elevenlabs_not_configured and names the env vars', () => {
    const r = mapMargotFailure(503, 'elevenlabs_not_configured');
    expect(r.category).toBe('not_configured');
    expect(r.nextAction).toMatch(/ELEVENLABS_API_KEY/);
    expect(r.nextAction).toMatch(/ELEVENLABS_MARGOT_AGENT_ID/);
  });

  it('maps 502 elevenlabs_signed_url_failed to upstream_failed', () => {
    const r = mapMargotFailure(502, 'elevenlabs_signed_url_failed');
    expect(r.category).toBe('upstream_failed');
    expect(r.message).toMatch(/non-OK/i);
  });

  it('maps elevenlabs_unreachable to upstream_unreachable (timeout/network)', () => {
    const r = mapMargotFailure(502, 'elevenlabs_unreachable');
    expect(r.category).toBe('upstream_unreachable');
    expect(r.message).toMatch(/timeout|network/i);
  });

  it('classifies a fetch-thrown error (status=null) as network', () => {
    const r = mapMargotFailure(null, null);
    expect(r.category).toBe('network');
    expect(r.nextAction).toMatch(/connection/i);
  });

  it('falls through to unknown for an unrecognised status+code pair', () => {
    const r = mapMargotFailure(418, 'i_am_a_teapot');
    expect(r.category).toBe('unknown');
    expect(r.nextAction).toMatch(/retry/i);
  });

  it('still recognises the code even if status is generic 500', () => {
    // The route can wrap upstream failures in different statuses; the code
    // is the load-bearing signal.
    const r = mapMargotFailure(500, 'elevenlabs_signed_url_failed');
    expect(r.category).toBe('upstream_failed');
  });
});
