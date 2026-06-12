import { mintAdminJwt, verifyAdminJwt } from '@/lib/auth/admin-jwt';
import { SignJWT } from 'jose';

const SECRET = 'test-secret-at-least-32-chars-long-OK';

beforeEach(() => {
  process.env.ADMIN_JWT_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.ADMIN_JWT_SECRET;
});

test('mint then verify round-trips with default scope', async () => {
  const token = await mintAdminJwt();
  expect(token).toMatch(/^eyJ/); // base64url JWT prefix
  const claims = await verifyAdminJwt(token);
  expect(claims).not.toBeNull();
  expect(claims!.scope).toBe('empire:full');
  expect(typeof claims!.iat).toBe('number');
  expect(typeof claims!.exp).toBe('number');
  expect(claims!.exp).toBeGreaterThan(claims!.iat);
});

test('custom scope is preserved through round-trip', async () => {
  const token = await mintAdminJwt('empire:read');
  const claims = await verifyAdminJwt(token);
  expect(claims!.scope).toBe('empire:read');
});

test('custom TTL is honoured', async () => {
  const token = await mintAdminJwt('empire:full', 60);
  const claims = await verifyAdminJwt(token);
  // exp - iat should equal ttl seconds (allow ±1 for clock granularity)
  expect(claims!.exp - claims!.iat).toBeGreaterThanOrEqual(59);
  expect(claims!.exp - claims!.iat).toBeLessThanOrEqual(61);
});

test('verify returns null for empty / null / undefined token', async () => {
  expect(await verifyAdminJwt('')).toBeNull();
  expect(await verifyAdminJwt(null)).toBeNull();
  expect(await verifyAdminJwt(undefined)).toBeNull();
});

test('verify returns null for malformed token', async () => {
  expect(await verifyAdminJwt('not-a-jwt')).toBeNull();
  expect(await verifyAdminJwt('eyJhbGc.invalid.payload')).toBeNull();
});

test('verify returns null when token is signed with a different secret', async () => {
  process.env.ADMIN_JWT_SECRET = SECRET;
  const token = await mintAdminJwt();
  process.env.ADMIN_JWT_SECRET =
    'a-different-secret-also-32-chars-long-OK';
  const claims = await verifyAdminJwt(token);
  expect(claims).toBeNull();
});

test('verify returns null when token is expired', async () => {
  const token = await mintAdminJwt('empire:full', 1); // 1-second TTL
  await new Promise((r) => setTimeout(r, 1200));
  const claims = await verifyAdminJwt(token);
  expect(claims).toBeNull();
});

test('verify returns null when subject is not "admin"', async () => {
  const secret = new TextEncoder().encode(SECRET);
  const token = await new SignJWT({ scope: 'empire:full' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('not-admin')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  const claims = await verifyAdminJwt(token);
  expect(claims).toBeNull();
});

test('verify returns null when scope claim is missing', async () => {
  const secret = new TextEncoder().encode(SECRET);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  const claims = await verifyAdminJwt(token);
  expect(claims).toBeNull();
});

test('mint throws when ADMIN_JWT_SECRET is unset', async () => {
  delete process.env.ADMIN_JWT_SECRET;
  await expect(mintAdminJwt()).rejects.toThrow(/ADMIN_JWT_SECRET/);
});

test('mint throws when ADMIN_JWT_SECRET is too short', async () => {
  process.env.ADMIN_JWT_SECRET = 'short';
  await expect(mintAdminJwt()).rejects.toThrow(/too short/);
});
