import {
  reduceVoicePanelState,
  initialVoicePanelState,
  initialVoicePanelSnapshot,
  type VoicePanelState,
  type VoicePanelSnapshot,
  type VoicePanelEvent,
  type VoicePanelFetchResult,
} from '../voice-panel-state';

// Tiny helper: build a snapshot from just the state, with empty signedUrl
// and null failure. Lets the tests read like a state-machine spec.
function snap(state: VoicePanelState, signedUrl: string = '', failure: VoicePanelSnapshot['failure'] = null): VoicePanelSnapshot {
  return { state, signedUrl, failure };
}

describe('reduceVoicePanelState (Margot voice panel state machine)', () => {
  it('starts in the idle state via the initialVoicePanelState helper', () => {
    expect(initialVoicePanelState).toBe<VoicePanelState>('idle');
  });

  it('starts with an empty signedUrl and null failure via the initialVoicePanelSnapshot helper', () => {
    expect(initialVoicePanelSnapshot).toEqual<VoicePanelSnapshot>({
      state: 'idle',
      signedUrl: '',
      failure: null,
    });
  });

  it('transitions idle -> loading on START', () => {
    const next = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    expect(next.state).toBe<VoicePanelState>('loading');
    expect(next.signedUrl).toBe('');
    expect(next.failure).toBeNull();
  });

  it('ignores duplicate START while already loading (button is disabled, but reducer must also be idempotent)', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const stillLoading = reduceVoicePanelState(loading, { kind: 'START' });
    expect(stillLoading.state).toBe<VoicePanelState>('loading');
    expect(stillLoading.signedUrl).toBe('');
    expect(stillLoading.failure).toBeNull();
  });

  it('transitions loading -> ready on a successful fetch result with a signed_url', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const result: VoicePanelFetchResult = {
      ok: true,
      status: 200,
      errorCode: null,
      signedUrl: 'https://api.elevenlabs.io/v1/convai/conversation?token=abc',
    };
    const next = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result });
    expect(next.state).toBe<VoicePanelState>('ready');
    expect(next.signedUrl).toBe(result.signedUrl);
    expect(next.failure).toBeNull();
  });

  it('transitions loading -> error on a non-ok fetch result and pins the failure taxonomy render', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const result: VoicePanelFetchResult = {
      ok: false,
      status: 401,
      errorCode: 'unauthorized',
      signedUrl: null,
    };
    const next = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result });
    expect(next.state).toBe<VoicePanelState>('error');
    expect(next.signedUrl).toBe('');
    expect(next.failure).not.toBeNull();
    expect(next.failure?.category).toBe('unauthorized');
    expect(next.failure?.title).toMatch(/sign in/i);
  });

  it('transitions loading -> error on a network failure (status=null) and pins the network category', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const result: VoicePanelFetchResult = {
      ok: false,
      status: null,
      errorCode: null,
      signedUrl: null,
    };
    const next = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result });
    expect(next.state).toBe<VoicePanelState>('error');
    expect(next.signedUrl).toBe('');
    expect(next.failure).not.toBeNull();
    expect(next.failure?.category).toBe('network');
  });

  it('transitions loading -> error on a 503 elevenlabs_not_configured and pins the not_configured category with env-var next action', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const result: VoicePanelFetchResult = {
      ok: false,
      status: 503,
      errorCode: 'elevenlabs_not_configured',
      signedUrl: null,
    };
    const next = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result });
    expect(next.state).toBe<VoicePanelState>('error');
    expect(next.failure?.category).toBe('not_configured');
    expect(next.failure?.nextAction).toMatch(/ELEVENLABS_API_KEY/);
    expect(next.failure?.nextAction).toMatch(/ELEVENLABS_MARGOT_AGENT_ID/);
  });

  it('allows a retry from error -> loading on a new START (operator can recover without page reload)', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const failResult: VoicePanelFetchResult = {
      ok: false,
      status: 429,
      errorCode: 'rate_limited',
      signedUrl: null,
    };
    const errored = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result: failResult });
    expect(errored.state).toBe<VoicePanelState>('error');

    const retry = reduceVoicePanelState(errored, { kind: 'START' });
    expect(retry.state).toBe<VoicePanelState>('loading');
    expect(retry.failure).toBeNull();
    expect(retry.signedUrl).toBe('');
  });

  it('does not transition out of ready on a duplicate START (the mounted widget keeps its signed URL)', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const okResult: VoicePanelFetchResult = {
      ok: true,
      status: 200,
      errorCode: null,
      signedUrl: 'https://api.elevenlabs.io/v1/convai/conversation?token=abc',
    };
    const ready = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result: okResult });
    expect(ready.state).toBe<VoicePanelState>('ready');

    const stillReady = reduceVoicePanelState(ready, { kind: 'START' });
    expect(stillReady.state).toBe<VoicePanelState>('ready');
    expect(stillReady.signedUrl).toBe(okResult.signedUrl);
    expect(stillReady.failure).toBeNull();
  });

  it('does not transition out of ready on a stale FETCH_RESOLVED (the widget stays mounted once the signed URL is set)', () => {
    const loading = reduceVoicePanelState(snap('idle'), { kind: 'START' });
    const okResult: VoicePanelFetchResult = {
      ok: true,
      status: 200,
      errorCode: null,
      signedUrl: 'https://api.elevenlabs.io/v1/convai/conversation?token=abc',
    };
    const ready = reduceVoicePanelState(loading, { kind: 'FETCH_RESOLVED', result: okResult });
    expect(ready.state).toBe<VoicePanelState>('ready');

    const stale: VoicePanelFetchResult = {
      ok: false,
      status: 500,
      errorCode: 'unknown',
      signedUrl: null,
    };
    const stillReady = reduceVoicePanelState(ready, { kind: 'FETCH_RESOLVED', result: stale });
    expect(stillReady.state).toBe<VoicePanelState>('ready');
    expect(stillReady.signedUrl).toBe(okResult.signedUrl);
  });

  it('refuses to act on a FETCH_RESOLVED that arrives while idle (defensive: stale event cannot resurrect a fresh panel)', () => {
    const next = reduceVoicePanelState(snap('idle'), {
      kind: 'FETCH_RESOLVED',
      result: {
        ok: true,
        status: 200,
        errorCode: null,
        signedUrl: 'https://api.elevenlabs.io/v1/convai/conversation?token=stale',
      },
    });
    expect(next.state).toBe<VoicePanelState>('idle');
    expect(next.signedUrl).toBe('');
    expect(next.failure).toBeNull();
  });
});

describe('VoicePanelEvent discriminated union', () => {
  it('only accepts the documented event kinds', () => {
    const start: VoicePanelEvent = { kind: 'START' };
    const resolved: VoicePanelEvent = {
      kind: 'FETCH_RESOLVED',
      result: { ok: true, status: 200, errorCode: null, signedUrl: 'x' },
    };
    expect(start.kind).toBe('START');
    expect(resolved.kind).toBe('FETCH_RESOLVED');
  });
});
