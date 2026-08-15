#!/usr/bin/env node
/**
 * Vercel Ignored Build Step for apps/web.
 *
 * Vercel builds a preview on every push to a PR branch and a production build
 * on every push to main. Measured over the last 50 commits to main, 16 of them
 * (32%) changed nothing under apps/web or any of its prebuild inputs — docs,
 * workspace-only fixes, MCP package work, governance files. Each of those still
 * ran a full `next build`. Vercel build time is metered; GitHub Actions on this
 * public repo is not. This script is the cheap half of the cost fix.
 *
 * CONTRACT (Vercel): exit 0 → SKIP the build. exit 1 → BUILD.
 * That is inverted from normal shell convention, so the exits below are
 * spelled out rather than returned from a boolean.
 *
 * FAIL-OPEN BY DESIGN. Every path where this script cannot prove the change is
 * irrelevant ends in BUILD, not SKIP. A needless build costs a minute of build
 * time. A wrongly skipped build leaves production serving the previous
 * deployment while the commit that was supposed to fix something sits merged
 * and undeployed — a silent stale-production incident that looks like a
 * successful merge. The asymmetry is not close, so ambiguity always builds.
 *
 * Vercel shallow-clones, so VERCEL_GIT_PREVIOUS_SHA is frequently absent from
 * the local object store. When the diff cannot be computed, that is ambiguity,
 * and ambiguity builds.
 *
 * Wire-up (apps/web/vercel.json):
 *   "ignoreCommand": "node ../../scripts/vercel-ignore-build.mjs"
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEB_BUILD_INPUTS, affectsWebBuild } from './lib/web-build-inputs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIP = 0;
const BUILD = 1;

function log(msg) {
  console.log(`[ignore-build] ${msg}`);
}

function finish(code, reason) {
  log(`${code === SKIP ? 'SKIP' : 'BUILD'} — ${reason}`);
  process.exit(code);
}

/** Returns trimmed stdout, or null if git exited non-zero. */
function git(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Exit-code-only check. Distinct from git() because the commands used here
 * (`cat-file -e`) print NOTHING on success — testing their stdout for
 * truthiness reads every success as a failure.
 */
function gitOk(args) {
  return git(args) !== null;
}

const currentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'HEAD';
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;

// No previous SHA: first build of the project, a cleared cache, or a rebuild
// triggered outside the git flow. Nothing to diff against.
if (!previousSha) {
  finish(BUILD, 'VERCEL_GIT_PREVIOUS_SHA is unset — no baseline to compare against');
}

// Confirm both objects are actually in this shallow clone before trusting a
// diff. `git diff` against a missing object can report an empty result rather
// than erroring, which would read as "nothing changed" and wrongly skip.
for (const [name, sha] of [['previous', previousSha], ['current', currentSha]]) {
  if (!gitOk(['cat-file', '-e', `${sha}^{commit}`])) {
    finish(BUILD, `${name} commit ${String(sha).slice(0, 8)} is not in this shallow clone`);
  }
}

const diff = git(['diff', '--name-only', `${previousSha}..${currentSha}`]);

if (diff === null) {
  finish(BUILD, 'git diff failed — cannot prove the change is irrelevant');
}

const files = diff.split('\n').filter(Boolean);

if (files.length === 0) {
  // An empty diff between two distinct, present commits is legitimate (an
  // empty commit, or a revert-and-reapply). Nothing changed, so nothing to
  // rebuild — but say so explicitly rather than falling through.
  finish(SKIP, `no files changed between ${previousSha.slice(0, 8)} and ${String(currentSha).slice(0, 8)}`);
}

if (affectsWebBuild(files)) {
  const hits = files.filter((f) => WEB_BUILD_INPUTS.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
  finish(BUILD, `${hits.length} of ${files.length} changed file(s) affect apps/web, e.g. ${hits.slice(0, 3).join(', ')}`);
}

finish(SKIP, `none of ${files.length} changed file(s) affect apps/web (checked against: ${WEB_BUILD_INPUTS.join(', ')})`);
