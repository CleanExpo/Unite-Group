// Passcode gate. The passcode lives in a local env var or file, is compared here
// and goes nowhere else. Sessions are random tokens held in memory, so restarting
// the server signs every window out.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SESSION_COOKIE = 'mc_session';
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_PASSCODE_LENGTH = 8;
export const MAX_FAILURES = 5;
export const LOCKOUT_MS = 30_000;

export class PasscodeConfigError extends Error {}

/** Fails closed: no usable passcode means the server does not start. Never echoes the value. */
export function loadPasscode(env: NodeJS.ProcessEnv, dataDir: string): string {
  let passcode = env.MC_PASSCODE;
  if (passcode === undefined) {
    const file = join(dataDir, 'passcode');
    let mode: number;
    try {
      mode = statSync(file).mode;
    } catch {
      throw new PasscodeConfigError(`No passcode. Set MC_PASSCODE or create ${file} (mode 600).`);
    }
    if ((mode & 0o077) !== 0) {
      throw new PasscodeConfigError(`${file} is readable by other users. Run: chmod 600 ${file}`);
    }
    passcode = readFileSync(file, 'utf8').trim();
  }
  if (passcode.length < MIN_PASSCODE_LENGTH) {
    throw new PasscodeConfigError(`Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.`);
  }
  return passcode;
}

const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

export function createAuth(passcode: string, now: () => number = Date.now) {
  const expected = digest(passcode);
  const sessions = new Map<string, number>();
  let failures = 0;
  let lockedUntil = 0;

  return {
    /** Returns a new session token, 'locked' during a lockout, or null for a wrong passcode. */
    login(attempt: string): string | 'locked' | null {
      if (now() < lockedUntil) return 'locked';
      if (!timingSafeEqual(digest(attempt), expected)) {
        failures += 1;
        if (failures >= MAX_FAILURES) {
          failures = 0;
          lockedUntil = now() + LOCKOUT_MS;
        }
        return null;
      }
      failures = 0;
      for (const [token, expires] of sessions) if (expires <= now()) sessions.delete(token);
      const token = randomBytes(32).toString('base64url');
      sessions.set(token, now() + SESSION_MS);
      return token;
    },
    valid(token: string | undefined): boolean {
      if (!token) return false;
      const expires = sessions.get(token);
      return expires !== undefined && expires > now();
    },
    logout(token: string | undefined): void {
      if (token) sessions.delete(token);
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}
