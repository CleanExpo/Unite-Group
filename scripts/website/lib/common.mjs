// Shared helpers for the client website-build tool. Node standard library only.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const TEMPLATE_DIR = join(REPO_ROOT, 'scripts', 'website', 'template', 'astro');
export const HOSTS = ['vercel'];
// Cloudflare Workers is verified to host a static Astro site, but v1 refuses it: the estate has no
// verified Cloudflare account, and a static Worker has no same-origin function to forward leads to
// the CRM (the leads route sends no CORS headers). Lift when both exist.
export const CLOUDFLARE_BLOCKER =
  'host "cloudflare" is not available yet: no verified Cloudflare account for the estate, and no Worker lead forwarder exists. Use --host vercel.';
// Committed images stay in a public monorepo's history forever. Astro makes the web sizes at build,
// so the source only needs to be a sensible master: about 2400 px wide, under 1 MB.
export const MAX_ASSET_BYTES = 1024 * 1024;
export const TIME_ZONE = 'Australia/Sydney';
// Folders inside incoming/ that hold reference or processed material, never site assets.
export const INCOMING_RESERVED = new Set(['reference', 'done', 'wordpress', 'changes']);

// True when this file was run as the program. Both sides go through realpath, because a script run
// through a symlinked folder has a different argv[1] from its module URL, and a plain comparison
// then skips main() and exits 0 having done nothing.
export function invokedDirectly(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

export class ToolError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

export function validateSlug(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 40) {
    throw new ToolError(`invalid slug "${slug}": use 2-40 lowercase letters, digits and single hyphens (e.g. smith-plumbing)`, 2);
  }
  return slug;
}

export function validateDomain(domain) {
  if (typeof domain !== 'string' || !/^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) {
    throw new ToolError(`invalid domain "${domain}": give the bare domain in lowercase, e.g. example.com.au`, 2);
  }
  if (domain.startsWith('www.')) {
    throw new ToolError(`give the bare domain, not www: "${domain.slice(4)}". www redirects to it.`, 2);
  }
  return domain;
}

function insideGitWorkTree(path) {
  let dir = resolve(path);
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Client material never lives inside a git work tree: the monorepo is public.
export function resolveClientRoot({ clientRoot, env = process.env } = {}) {
  const raw = clientRoot ?? env.CLIENT_PROJECTS_ROOT ?? join(homedir(), 'client-projects');
  if (!isAbsolute(raw)) throw new ToolError(`CLIENT_PROJECTS_ROOT must be an absolute path, got "${raw}"`, 2);
  const root = resolve(raw);
  const repo = insideGitWorkTree(root);
  if (repo) {
    throw new ToolError(`client projects folder ${root} is inside the git work tree ${repo}; client material must stay outside any repo`, 2);
  }
  return root;
}

function nearestExisting(path) {
  let dir = resolve(path);
  while (!existsSync(dir)) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dir;
}

// Reads the encryption state of the volume holding `path`. Returns { encrypted, volume, reason }:
// encrypted is true or false when the system said so, and null when it could not be told.
// macOS only for now; any other system answers null, so the tool refuses rather than guesses.
export function systemEncryptionProbe(path, { platform = process.platform, exec = execFileSync } = {}) {
  if (platform !== 'darwin') {
    return { encrypted: null, volume: null, reason: `this tool can only read disk encryption on macOS, not ${platform}` };
  }
  const existing = nearestExisting(path);
  const dfLines = exec('/bin/df', ['-P', existing], { encoding: 'utf8' }).trim().split('\n');
  const device = (dfLines[dfLines.length - 1] || '').split(/\s+/)[0];
  if (!device || !device.startsWith('/dev/')) return { encrypted: null, volume: device || null, reason: `df did not name a disk for ${existing}` };
  const plist = exec('/usr/sbin/diskutil', ['info', '-plist', device], { encoding: 'utf8' });
  const flag = (key) => {
    const m = plist.match(new RegExp(`<key>${key}</key>\\s*<(true|false)/>`));
    return m ? m[1] === 'true' : null;
  };
  const fileVault = flag('FileVault');
  const encryption = flag('Encryption');
  if (fileVault === true || encryption === true) return { encrypted: true, volume: device, reason: 'reported encrypted' };
  if (fileVault === false || encryption === false) return { encrypted: false, volume: device, reason: 'diskutil reports it is not encrypted' };
  return { encrypted: null, volume: device, reason: 'diskutil reported neither FileVault nor Encryption' };
}

// Client copy, photos, contact details and email drafts must sit on encrypted storage. Every command
// checks this first and refuses when the volume is not encrypted or when the answer is unknown.
export function ensureEncryptedRoot(root, probe = systemEncryptionProbe) {
  let result;
  try {
    result = probe(root);
  } catch (err) {
    result = { encrypted: null, volume: null, reason: `the encryption check failed: ${err.message.split('\n')[0]}` };
  }
  if (result?.encrypted === true) return result;
  if (result?.encrypted === false) {
    throw new ToolError(`client projects folder ${root} is on ${result.volume ?? 'a volume'}, which is not encrypted. Client material must sit on encrypted storage: use a folder on the FileVault boot disk (the default ~/client-projects) or on an encrypted external volume.`, 2);
  }
  throw new ToolError(`cannot tell whether ${root} is on encrypted storage (${result?.reason ?? 'no answer'}); refusing to read or write client material there.`, 2);
}

export function resolveSitesDir({ sitesDir } = {}) {
  return resolve(sitesDir ?? join(REPO_ROOT, 'sites'));
}

export function workspacePath(ctx, slug) {
  return join(ctx.clientRoot, validateSlug(slug));
}

export function requireWorkspace(ctx, slug) {
  const ws = workspacePath(ctx, slug);
  if (!existsSync(join(ws, 'project.json'))) {
    throw new ToolError(`project workspace for "${slug}" is not on this machine (${ws}); copy it here or run on the machine that holds it`);
  }
  return ws;
}

export function readProject(ws) {
  let project;
  try {
    project = JSON.parse(readFileSync(join(ws, 'project.json'), 'utf8'));
  } catch (err) {
    throw new ToolError(`project.json in ${ws} is unreadable: ${err.message}`);
  }
  for (const key of ['slug', 'name', 'domain', 'host']) {
    if (typeof project[key] !== 'string' || !project[key]) throw new ToolError(`project.json in ${ws} has no ${key}`);
  }
  if (!HOSTS.includes(project.host)) throw new ToolError(`project.json in ${ws} has unknown host "${project.host}"`);
  return project;
}

// Write via a sibling temp file and rename, so a crash never leaves a half-written file.
export function writeFileAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

export function writeJsonAtomic(path, value) {
  writeFileAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function isoDate(now) {
  return now.toISOString().slice(0, 10);
}

export function auDateTime(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

// The public manifest is committed to a public repo, so the approver is a role or a reference into
// the private name log, never an email address or a phone number.
export function personalContactIn(value) {
  return typeof value === 'string' && (value.includes('@') || /\d[\d\s-]{6,}\d/.test(value));
}

export function freeName(dir, base, ext) {
  let candidate = join(dir, `${base}${ext}`);
  for (let n = 2; existsSync(candidate); n += 1) candidate = join(dir, `${base}-${n}${ext}`);
  return candidate;
}
