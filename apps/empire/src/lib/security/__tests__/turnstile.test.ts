import { verifyTurnstile } from '@/lib/turnstile';

const fetchMock = jest.fn();
beforeAll(() => {
  (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});

beforeEach(() => {
  fetchMock.mockReset();
  process.env.CF_TURNSTILE_SECRET_KEY = 'test-secret';
});

afterEach(() => {
  delete process.env.CF_TURNSTILE_SECRET_KEY;
});

function mockResponse(body: Record<string, unknown>, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

test('happy path — success=true with hostname + action', async () => {
  mockResponse({
    success: true,
    'error-codes': [],
    hostname: 'unite-group.in',
    action: 'onboarding',
  });
  const r = await verifyTurnstile('tok', '1.2.3.4');
  expect(r.success).toBe(true);
  expect(r.errorCodes).toEqual([]);
  expect(r.hostname).toBe('unite-group.in');
  expect(r.action).toBe('onboarding');
});

test('missing secret env var fails closed without calling fetch', async () => {
  delete process.env.CF_TURNSTILE_SECRET_KEY;
  const r = await verifyTurnstile('tok', '1.2.3.4');
  expect(r.success).toBe(false);
  expect(r.errorCodes).toEqual(['missing-secret']);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('empty token fails closed without calling fetch', async () => {
  const r = await verifyTurnstile('', '1.2.3.4');
  expect(r.success).toBe(false);
  expect(r.errorCodes).toEqual(['missing-input-response']);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('null token fails closed without calling fetch', async () => {
  const r = await verifyTurnstile(null, '1.2.3.4');
  expect(r.success).toBe(false);
  expect(r.errorCodes).toEqual(['missing-input-response']);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('cloudflare returns success=false with error codes — propagates', async () => {
  mockResponse({
    success: false,
    'error-codes': ['invalid-input-response', 'timeout-or-duplicate'],
  });
  const r = await verifyTurnstile('tok', '1.2.3.4');
  expect(r.success).toBe(false);
  expect(r.errorCodes).toEqual([
    'invalid-input-response',
    'timeout-or-duplicate',
  ]);
});

test('non-2xx siteverify response fails closed with http error code', async () => {
  mockResponse({}, 503);
  const r = await verifyTurnstile('tok', '1.2.3.4');
  expect(r.success).toBe(false);
  expect(r.errorCodes).toEqual(['http-503']);
});

test('fetch throws — fails closed with internal-error', async () => {
  fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
  const r = await verifyTurnstile('tok', '1.2.3.4');
  expect(r.success).toBe(false);
  expect(r.errorCodes).toEqual(['internal-error']);
});

test('null remoteIp omits the remoteip field from the request', async () => {
  mockResponse({ success: true });
  await verifyTurnstile('tok', null);
  const call = fetchMock.mock.calls[0];
  const body = call[1].body as URLSearchParams;
  expect(body.has('remoteip')).toBe(false);
  expect(body.get('secret')).toBe('test-secret');
  expect(body.get('response')).toBe('tok');
});

test('non-null remoteIp includes the remoteip field', async () => {
  mockResponse({ success: true });
  await verifyTurnstile('tok', '203.0.113.7');
  const call = fetchMock.mock.calls[0];
  const body = call[1].body as URLSearchParams;
  expect(body.get('remoteip')).toBe('203.0.113.7');
});
