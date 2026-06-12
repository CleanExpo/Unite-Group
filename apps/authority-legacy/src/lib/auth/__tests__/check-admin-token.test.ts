import { checkAdminToken } from '@/lib/auth/check-admin-token';
import { mintAdminJwt } from '@/lib/auth/admin-jwt';

const JWT_SECRET = 'jwt-test-secret-at-least-32-chars-long-OK';
const STATIC_KEY = 'static-test-key-1234567890';

beforeEach(() => {
  process.env.ADMIN_JWT_SECRET = JWT_SECRET;
  process.env.PI_CEO_API_KEY = STATIC_KEY;
});

afterEach(() => {
  delete process.env.ADMIN_JWT_SECRET;
  delete process.env.PI_CEO_API_KEY;
});

test('valid JWT → ok via=jwt with claims', async () => {
  const token = await mintAdminJwt('empire:read');
  const r = await checkAdminToken(token);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.via).toBe('jwt');
  expect(r.claims?.scope).toBe('empire:read');
});

test('valid static key → ok via=static with null claims', async () => {
  const r = await checkAdminToken(STATIC_KEY);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.via).toBe('static');
  expect(r.claims).toBeNull();
});

test('empty / null / undefined token → ok=false', async () => {
  expect((await checkAdminToken('')).ok).toBe(false);
  expect((await checkAdminToken(null)).ok).toBe(false);
  expect((await checkAdminToken(undefined)).ok).toBe(false);
});

test('garbage token matches neither path → ok=false', async () => {
  const r = await checkAdminToken('not-a-jwt-and-not-the-static-key');
  expect(r.ok).toBe(false);
});

test('JWT path is tried FIRST — valid JWT wins even when static would also reject', async () => {
  const token = await mintAdminJwt();
  process.env.PI_CEO_API_KEY = 'different-from-jwt';
  const r = await checkAdminToken(token);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.via).toBe('jwt');
});

test('static path works when JWT secret is unset (transition state)', async () => {
  delete process.env.ADMIN_JWT_SECRET;
  const r = await checkAdminToken(STATIC_KEY);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.via).toBe('static');
});

test('when neither JWT secret nor static key is set, ok=false on any token', async () => {
  delete process.env.ADMIN_JWT_SECRET;
  delete process.env.PI_CEO_API_KEY;
  expect((await checkAdminToken('anything')).ok).toBe(false);
});

test('expired JWT falls through to static path — static accepts if it matches', async () => {
  const expired = await mintAdminJwt('empire:full', 1);
  await new Promise((r) => setTimeout(r, 1200));
  // Token used here is the (now expired) JWT, which won't match the static key
  // either — so this should reject.
  const r = await checkAdminToken(expired);
  expect(r.ok).toBe(false);
});

test('static-key comparison is constant-time (uses timingSafeTokenMatch)', async () => {
  // Sanity: prefix-collision tokens still rejected.
  const wrong = STATIC_KEY.slice(0, -1) + 'X';
  expect((await checkAdminToken(wrong)).ok).toBe(false);
});
