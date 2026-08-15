/**
 * The preflight job table — a one-to-one mirror of .github/workflows/ci.yml.
 *
 * Lives in its own module so scripts/__tests__/preflight.test.mjs can import
 * and check it against ci.yml WITHOUT executing the runner. That test is the
 * whole point of the split: a new CI job added to ci.yml and not represented
 * here would otherwise escape preflight silently, and the first anyone hears of
 * it is a red check on a pushed PR — exactly the round trip preflight exists to
 * prevent. The test fails instead.
 *
 * `always: true` → cheap gate (seconds in CI); runs regardless of the diff,
 *                  because path-scoping it saves nothing and risks a miss.
 * `paths`        → prefixes that select an expensive gate.
 * `matchSuffix`  → match on basename instead of prefix (lockfiles, anywhere).
 * `cmd`          → [binary, args, optionalCwdRelativeToRepoRoot]
 */
import { WEB_BUILD_INPUTS } from './web-build-inputs.mjs';

export const JOBS = [
  {
    id: 'au-english',
    ciJob: 'au-english',
    label: 'Australian-English content guard',
    always: true,
    cmd: ['node', ['scripts/check-au-english.mjs']],
  },
  {
    id: 'readiness',
    ciJob: 'project-readiness',
    label: 'Nexus project-readiness P0 gate',
    always: true,
    cmd: ['npm', ['run', 'verify:readiness']],
  },
  {
    id: 'docs-watch',
    ciJob: 'docs-watch',
    label: 'Nexus official-docs watcher',
    always: true,
    cmd: ['npm', ['run', 'verify:docs-watch']],
  },
  {
    id: 'board-verifier',
    ciJob: 'board-release-verifier',
    label: 'tools/board-release-verifier — tests',
    paths: ['tools/board-release-verifier/'],
    cmd: ['python3', ['-m', 'unittest', 'discover', '-s', 'tests'], 'tools/board-release-verifier'],
  },
  {
    id: 'dependency-audit',
    ciJob: 'dependency-audit',
    label: 'Active lockfiles — high-severity audit',
    // Network-bound; only worth running when a lockfile actually moved.
    paths: ['package-lock.json', 'pnpm-lock.yaml', 'package.json'],
    matchSuffix: true,
    cmd: ['node', ['scripts/audit-active-lockfiles.mjs']],
  },
  {
    id: 'web',
    ciJob: 'web',
    label: 'apps/web — lint, type-check, test, build',
    // Shared with the Vercel ignore step so the two can never disagree about
    // what an apps/web build depends on.
    paths: WEB_BUILD_INPUTS,
    cmd: ['npm', ['run', 'verify:web']],
  },
  {
    id: 'workspace',
    ciJob: 'workspace',
    label: 'apps/workspace — type-check, test, build',
    paths: ['apps/workspace/'],
    cmd: ['npm', ['run', 'verify:workspace']],
  },
  {
    id: 'autopilot',
    ciJob: 'autopilot',
    label: 'apps/autopilot-runner — test, type-check, build',
    paths: ['apps/autopilot-runner/'],
    cmd: ['npm', ['run', 'verify:autopilot']],
  },
  {
    id: 'mcp',
    ciJob: 'mcp',
    label: 'packages/pi-ceo-operator-mcp — contracts, build, licences',
    paths: ['packages/pi-ceo-operator-mcp/'],
    cmd: ['npm', ['run', 'verify:mcp']],
  },
  {
    id: 'spine',
    ciJob: 'spine',
    label: 'packages/spine — type-check and bounded tests',
    paths: ['packages/spine/'],
    cmd: ['npm', ['run', 'verify:spine']],
  },
  {
    id: 'spec-board',
    ciJob: 'spec-board',
    label: 'apps/spec-board — type-check, test, build',
    paths: ['apps/spec-board/'],
    cmd: ['npm', ['run', 'verify:spec-board']],
  },
];

/**
 * CI jobs deliberately NOT reproducible on a developer machine. Listed
 * explicitly, with the reason, so the coverage test treats them as accounted
 * for rather than missing — and so preflight can print an honest "CI will
 * still run these" line instead of implying a green preflight means green CI.
 */
export const UNREPRODUCIBLE = {
  'mcp-windows': 'needs a Windows runner',
  'mcp-musl': 'needs an Alpine/musl container',
  e2e: 'opt-in lane; needs E2E_SUPABASE_* secrets (run `pnpm test:e2e` in apps/web directly)',
  gitleaks: 'needs the gitleaks binary on PATH',
};

/**
 * True when a job should run for the given changed files.
 * @param {object} job    entry from JOBS
 * @param {string[]} files repo-relative changed paths
 * @param {boolean} runAll force every job
 */
export function jobMatches(job, files, runAll = false) {
  if (job.always || runAll) return true;
  if (!job.paths) return false;
  return files.some((f) =>
    job.paths.some((p) => (job.matchSuffix ? f === p || f.endsWith(`/${p}`) : f.startsWith(p))),
  );
}
