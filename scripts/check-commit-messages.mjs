#!/usr/bin/env node
/**
 * Fail a commit whose subject omits a Linear ref, or whose body omits Gate:.
 *
 * WHY THIS GUARD EXISTS. nexus-conventions require "conventional commit +
 * Linear ref" on the subject and a `Gate:` line in the body. Nothing enforced
 * either rule, so they failed silently. The instance that made this ticket
 * (UNI-2658) was `14bb3b60` on PR #1066:
 *
 *   subject: fix(deps): bump fast-uri override to 4.1.4 across four lockfiles
 *   body:    (no Gate: line)
 *
 * The PR title later gained `(UNI-2640)`; the commit subject did not. A
 * squash-merge would have papered over that one SHA. The durable fix is a
 * check, not a reminder. #1066 is already merged; this guard is the work.
 *
 * RANGE, NOT HISTORY. Only commits in <base>...<head> are judged. Re-scanning
 * main would fail every historical squash that never carried a ref. The
 * enforcement point is the PR (and the local preflight that mirrors it).
 *
 * FAIL CLOSED ON A MISSING BASE. A shallow checkout that cannot see
 * origin/main must not report "0 commits, clean". That is the same class of
 * defect as a NUL-byte guard that skipped every extensionless file and
 * printed clean.
 *
 * Runs in milliseconds. No dependencies.
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/**
 * Linear team prefixes that count as a ticket ref in this workspace.
 *
 * Allowlisted, not `[A-Z]{2,4}`: the generic shape matches UTF-8, SHA-256
 * and ISO-8601, which would let a subject pass with no ticket at all. UNI
 * and RA are the prefixes UNI-2658 names; SYN / CCW / DR already appear as
 * Linear keys in this repo's own resolvers and tests.
 */
export const LINEAR_TEAM_PREFIXES = Object.freeze(['UNI', 'RA', 'SYN', 'CCW', 'DR']);

export const LINEAR_REF_RE = new RegExp(
  String.raw`\b(?:${LINEAR_TEAM_PREFIXES.join('|')})-\d{1,5}\b`,
  'i',
);

/** A body line that is the nexus-conventions gate line, with content after it. */
export const GATE_LINE_RE = /^\s*(?:\*\*)?Gate:(?:\*\*)?\s+\S/m;

/** Mechanical merge subjects git / GitHub mint; not author-written work. */
export const MECHANICAL_MERGE_RE =
  /^Merge (?:(?:remote-tracking )?branch|pull request #\d+)\b/;

export function extractLinearRef(subject) {
  const match = String(subject ?? '').match(LINEAR_REF_RE);
  return match ? match[0].toUpperCase() : null;
}

export function hasLinearRef(subject) {
  return extractLinearRef(subject) !== null;
}

export function hasGateLine(body) {
  return GATE_LINE_RE.test(String(body ?? ''));
}

export function isMechanicalMerge({ subject = '', parents = [] } = {}) {
  if (Array.isArray(parents) && parents.filter(Boolean).length >= 2) return true;
  return MECHANICAL_MERGE_RE.test(String(subject));
}

/**
 * Inspect one commit. `parents` is the list of parent SHAs (empty / one for
 * a regular commit, two-plus for a merge).
 */
export function inspectCommit({ subject = '', body = '', parents = [] } = {}) {
  if (isMechanicalMerge({ subject, parents })) {
    return { ok: true, skipped: true, reason: 'mechanical-merge' };
  }

  const reasons = [];
  if (!hasLinearRef(subject)) reasons.push('missing-linear-ref');
  if (!hasGateLine(body)) reasons.push('missing-gate-line');

  if (reasons.length === 0) return { ok: true, skipped: false };
  return { ok: false, skipped: false, reasons, subject };
}

export function inspectCommits(commits) {
  const violations = [];
  let checked = 0;
  let skipped = 0;

  for (const commit of commits) {
    const result = inspectCommit(commit);
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    checked += 1;
    if (!result.ok) {
      violations.push({
        sha: commit.sha ?? null,
        subject: commit.subject,
        reasons: result.reasons,
      });
    }
  }

  return { violations, checked, skipped };
}

/**
 * Resolve <base> <head>. Missing base is a hard failure, never an empty range.
 *
 * @param {{ argv?: string[], env?: NodeJS.ProcessEnv, refExists?: (ref: string) => boolean }} opts
 */
export function resolveRange({ argv = [], env = process.env, refExists } = {}) {
  const exists = refExists ?? (() => true);

  if (argv.length >= 2) {
    const [base, head] = argv;
    if (!exists(base)) {
      return { ok: false, error: `base ref not found: ${base}` };
    }
    return { ok: true, base, head };
  }

  const githubBase = String(env.GITHUB_BASE_REF ?? '').trim();
  if (githubBase) {
    const base = githubBase.includes('/') ? githubBase : `origin/${githubBase}`;
    if (!exists(base)) {
      return { ok: false, error: `base ref not found: ${base}` };
    }
    return { ok: true, base, head: 'HEAD' };
  }

  for (const candidate of ['origin/main', 'main']) {
    if (exists(candidate)) return { ok: true, base: candidate, head: 'HEAD' };
  }

  return {
    ok: false,
    error: 'cannot resolve a base ref (pass <base> <head>, or fetch origin/main)',
  };
}

/** Parse `git log --format=%H%x1f%P%x1f%s%x1f%b%x1e` output. */
export function parseGitLog(stdout) {
  const records = String(stdout ?? '').split('\x1e').filter((r) => r.trim() !== '');
  return records.map((record) => {
    const trimmed = record.replace(/^\n/, '');
    const [sha = '', parentLine = '', subject = '', ...bodyParts] = trimmed.split('\x1f');
    return {
      sha: sha.trim(),
      parents: parentLine.trim() ? parentLine.trim().split(/\s+/) : [],
      subject,
      body: bodyParts.join('\x1f'),
    };
  });
}

function defaultGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function refExistsWithGit(git, cwd, ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref], cwd);
    return true;
  } catch {
    return false;
  }
}

function formatViolation(v) {
  const sha = v.sha ? v.sha.slice(0, 12) : '(unknown)';
  const reasons = v.reasons
    .map((r) => (r === 'missing-linear-ref'
      ? 'subject has no Linear ref (UNI-#### / RA-####)'
      : 'body has no Gate: line'))
    .join('; ');
  return `  ${sha}  ${v.subject}\n    ${reasons}`;
}

/**
 * @param {{ cwd?: string, argv?: string[], env?: NodeJS.ProcessEnv, git?: Function }} opts
 * @returns {number} process exit code
 */
export function main({
  cwd = process.cwd(),
  argv = process.argv.slice(2),
  env = process.env,
  git = (args) => defaultGit(args, cwd),
} = {}) {
  const range = resolveRange({
    argv,
    env,
    refExists: (ref) => refExistsWithGit(git, cwd, ref),
  });

  if (!range.ok) {
    console.error(`COMMIT MESSAGE GUARD: ${range.error}`);
    console.error('A missing base must not be treated as an empty (clean) range.');
    return 1;
  }

  let raw;
  try {
    raw = git(
      ['log', '--format=%H%x1f%P%x1f%s%x1f%b%x1e', `${range.base}...${range.head}`],
      cwd,
    );
  } catch (err) {
    console.error(`COMMIT MESSAGE GUARD: git log failed for ${range.base}...${range.head}`);
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  const commits = parseGitLog(raw);
  const { violations, checked, skipped } = inspectCommits(commits);

  if (violations.length === 0) {
    console.log(
      `Commit-message guard: clean (${checked} checked, ${skipped} skipped, ` +
        `range ${range.base}...${range.head})`,
    );
    return 0;
  }

  console.error('COMMIT MESSAGE CONVENTION FAILED — nexus-conventions require');
  console.error('a Linear ref on the subject and a Gate: line in the body:\n');
  for (const v of violations) console.error(formatViolation(v));
  console.error('\nExample:');
  console.error('  feat(ci): describe the change (UNI-2658)');
  console.error('');
  console.error('  What cannot happen after this merge: ...');
  console.error('');
  console.error('  Gate: <the gauntlet that actually ran>.');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
