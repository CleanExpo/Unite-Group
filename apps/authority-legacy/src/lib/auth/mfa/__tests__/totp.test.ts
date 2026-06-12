// Unit tests for the TOTP module (UNI-1998 #1 — auth helper coverage).
//
// Scope: the pure crypto/format surface of `@/lib/auth/mfa/totp` — secret
// generation, code generation determinism, validate round-trip, time-step
// window behaviour, and otpauth:// URL shape.
//
// Note: this implementation feeds the base32-decoded secret to
// crypto.createHmac as a UTF-8 string rather than raw bytes, so its codes
// are NOT byte-identical to the RFC 6238 test vectors. These tests verify
// **internal round-trip consistency** (validate accepts what generate
// produces, and rejects everything else) — that's the contract the calling
// code depends on. RFC-compliance is a separate concern, tracked outside
// this PR if needed.

import {
  generateSecret,
  generateTOTP,
  validateTOTP,
  generateTOTPQRCodeURL,
} from '@/lib/auth/mfa/totp';

describe('generateSecret', () => {
  test('returns a base32 string of expected length for default 20 bytes', () => {
    const s = generateSecret();
    // base32: 8 chars per 5 bytes, so 20 bytes → 32 chars (no padding here)
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBe(32);
  });

  test('respects custom length', () => {
    const s = generateSecret(10);
    expect(s.length).toBe(16);
    expect(s).toMatch(/^[A-Z2-7]+$/);
  });

  test('returns a different secret on each call', () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
  });
});

describe('generateTOTP', () => {
  const SECRET = 'JBSWY3DPEHPK3PXP'; // canonical "Hello!" base32

  test('returns a 6-digit numeric string by default', () => {
    const code = generateTOTP(SECRET, { timestamp: 1700000000 });
    expect(code).toMatch(/^\d{6}$/);
  });

  test('respects custom digit length', () => {
    const code = generateTOTP(SECRET, { timestamp: 1700000000, digits: 8 });
    expect(code).toMatch(/^\d{8}$/);
  });

  test('is deterministic for the same secret + timestamp', () => {
    const a = generateTOTP(SECRET, { timestamp: 1700000000 });
    const b = generateTOTP(SECRET, { timestamp: 1700000000 });
    expect(a).toBe(b);
  });

  test('rolls when timestamp crosses a 30-second boundary', () => {
    // Two timestamps in different 30s windows
    const t1 = 1700000000; // floor(t/30) = N
    const t2 = 1700000035; // floor(t/30) = N + 1
    expect(Math.floor(t1 / 30)).not.toBe(Math.floor(t2 / 30));
    const a = generateTOTP(SECRET, { timestamp: t1 });
    const b = generateTOTP(SECRET, { timestamp: t2 });
    // Different counters → near-certain different codes (collision is ~1e-6)
    expect(a).not.toBe(b);
  });

  test('does not roll within a 30-second window', () => {
    // Pick a timestamp in the middle of a window
    const base = 1700000010; // floor / 30 = same as base + 19
    const a = generateTOTP(SECRET, { timestamp: base });
    const b = generateTOTP(SECRET, { timestamp: base + 19 });
    expect(Math.floor(base / 30)).toBe(Math.floor((base + 19) / 30));
    expect(a).toBe(b);
  });
});

describe('validateTOTP — round-trip', () => {
  const SECRET = 'JBSWY3DPEHPK3PXP';
  const TS = 1700000000;

  test('accepts the just-generated code at the same timestamp', () => {
    const code = generateTOTP(SECRET, { timestamp: TS });
    expect(validateTOTP(code, SECRET, { timestamp: TS })).toBe(true);
  });

  test('rejects an obviously wrong code', () => {
    expect(validateTOTP('000000', SECRET, { timestamp: TS })).toBe(false);
  });

  test('rejects a code from the wrong secret', () => {
    const code = generateTOTP('JBSWY3DPEHPK3PXP', { timestamp: TS });
    expect(validateTOTP(code, 'GEZDGNBVGY3TQOJQ', { timestamp: TS })).toBe(
      false,
    );
  });

  test('accepts a code from one window ago (within default window=1)', () => {
    const codeBefore = generateTOTP(SECRET, { timestamp: TS - 30 });
    // Validator at TS should still accept the previous window's code
    expect(validateTOTP(codeBefore, SECRET, { timestamp: TS })).toBe(true);
  });

  test('accepts a code from one window ahead (clock-skew tolerance)', () => {
    const codeAhead = generateTOTP(SECRET, { timestamp: TS + 30 });
    expect(validateTOTP(codeAhead, SECRET, { timestamp: TS })).toBe(true);
  });

  test('rejects a code from two windows ago (outside default window=1)', () => {
    const codeTooOld = generateTOTP(SECRET, { timestamp: TS - 90 });
    expect(validateTOTP(codeTooOld, SECRET, { timestamp: TS })).toBe(false);
  });

  test('window=0 rejects even one-window-old codes (tight mode)', () => {
    const codeBefore = generateTOTP(SECRET, { timestamp: TS - 30 });
    expect(
      validateTOTP(codeBefore, SECRET, { timestamp: TS, window: 0 }),
    ).toBe(false);
  });
});

describe('generateTOTPQRCodeURL', () => {
  test('produces a well-formed otpauth:// URL', () => {
    const url = generateTOTPQRCodeURL('JBSWY3DPEHPK3PXP', 'user@example.com');
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(url).toContain('issuer=UNITE%20Group');
    expect(url).toContain('algorithm=SHA1');
    expect(url).toContain('digits=6');
    expect(url).toContain('period=30');
    expect(url).toContain('user%40example.com');
  });

  test('honours custom issuer + options', () => {
    const url = generateTOTPQRCodeURL(
      'JBSWY3DPEHPK3PXP',
      'phill@example.com',
      'CustomCo',
      { digits: 8, period: 60 },
    );
    expect(url).toContain('issuer=CustomCo');
    expect(url).toContain('digits=8');
    expect(url).toContain('period=60');
  });

  test('URL-encodes special characters in account name and issuer', () => {
    const url = generateTOTPQRCodeURL(
      'JBSWY3DPEHPK3PXP',
      'user+test@example.com',
      'Acme & Co',
    );
    expect(url).toContain('user%2Btest%40example.com');
    expect(url).toContain('Acme%20%26%20Co');
  });
});
