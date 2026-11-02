// Passcode gate. The passcode lives in a local env var or file, is compared here
// and goes nowhere else. Sessions are random tokens held in memory, so restarting
// the server signs every window out.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { join, resolve } from 'node:path';

export const SESSION_COOKIE = 'mc_session';
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_PASSCODE_LENGTH = 8;
export const MAX_FAILURES = 5;
export const LOCKOUT_MS = 30_000;

export class PasscodeConfigError extends Error {}

/**
 * On POSIX the folder and file must belong to the user running the server, and nobody
 * else may have any access: if another user could write the folder, they could swap
 * the passcode file. Windows has no POSIX modes (Node reports every file as 0o666),
 * so there only the symlink rule applies and the folder's ACL is the operator's job.
 */
export const POSIX_PERMISSIONS = process.platform !== 'win32';

function currentUid(): number | undefined {
  return typeof process.getuid === 'function' ? process.getuid() : undefined;
}

/** Throws unless `stats` is the expected kind, not a symlink, owned by us and private. */
export function checkPrivate(
  path: string,
  stats: Stats,
  kind: 'folder' | 'file',
  posix = POSIX_PERMISSIONS,
  uid = currentUid(),
): void {
  if (stats.isSymbolicLink()) throw new PasscodeConfigError(`${path} is a symlink. Use a real ${kind}.`);
  if (kind === 'folder' ? !stats.isDirectory() : !stats.isFile()) {
    throw new PasscodeConfigError(`${path} is not a ${kind}.`);
  }
  if (!posix) return;
  if (uid === undefined || stats.uid !== uid) {
    throw new PasscodeConfigError(`${path} is not owned by the user running Mission Control.`);
  }
  const mode = stats.mode & 0o777;
  if (kind === 'folder' && mode !== 0o700) {
    throw new PasscodeConfigError(`${path} must be private to you. Run: chmod 700 ${path}`);
  }
  if (kind === 'file' && (mode & 0o077) !== 0) {
    throw new PasscodeConfigError(`${path} is readable by other users. Run: chmod 600 ${path}`);
  }
}

/** Fails closed: no usable passcode means the server does not start. Never echoes the value. */
export function loadPasscode(env: NodeJS.ProcessEnv, dataDirInput: string, posix = POSIX_PERMISSIONS): string {
  let passcode = env.MC_PASSCODE;
  if (passcode === undefined) {
    // resolve() drops a trailing slash, which would make lstat follow a symlinked folder.
    const dataDir = resolve(dataDirInput);
    const file = join(dataDir, 'passcode');
    let folder: Stats;
    try {
      folder = lstatSync(dataDir);
    } catch {
      throw new PasscodeConfigError(`No passcode. Set MC_PASSCODE or create ${file} (folder mode 700, file mode 600).`);
    }
    checkPrivate(dataDir, folder, 'folder', posix);
    // The folder is private now, so nobody else can swap the file after this check.
    // O_NOFOLLOW refuses a symlink at open time too, where the platform has it.
    let fd: number;
    try {
      fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new PasscodeConfigError(`No passcode. Set MC_PASSCODE or create ${file} (mode 600).`);
      }
      throw new PasscodeConfigError(`${file} could not be opened. It must be a real file, mode 600.`);
    }
    try {
      checkPrivate(file, lstatSync(file), 'file', posix);
      checkPrivate(file, fstatSync(fd), 'file', posix);
      passcode = readFileSync(fd, 'utf8').trim();
    } finally {
      closeSync(fd);
    }
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
