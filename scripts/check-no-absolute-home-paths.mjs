#!/usr/bin/env node
/**
 * Fail if a tracked file contains an absolute home path (`/Users/<name>/` or
 * `/home/<name>/`).
 *
 * WHY THIS GUARD EXISTS. Found 05/09/2026 while closing UNI-2659: ignore rules
 * cannot stop a future control script from embedding a local path, so the
 * durable protection is a content scan. It was not adoptable then — 122 tracked
 * files already matched. UNI-2660 is the cleanup plus this gate.
 *
 * The measurement regex on main was:
 *
 *   (/Users/|/home/)[A-Za-z0-9._-]+/
 *
 * That is the denylist. A comment that writes `/Users/<name>/` with angle
 * brackets does not match, so the pattern can be discussed without the file
 * becoming an offender.
 *
 * Follows the check-no-nul-bytes.mjs idiom: denylist of binary formats (not an
 * include-list of "source" extensions), explicit per-file allowlist entries
 * with a written reason, a positive control, and a mutation control.
 *
 * Runs in milliseconds. No dependencies.
 */

import { execSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Binary formats, which are not review surface for a text path scan.
 *
 * DENYLIST, NOT AN ALLOWLIST — same inversion as the NUL-byte guard. A format
 * nobody listed gets REPORTED rather than skipped.
 */
const BINARY_EXTENSIONS = new Set([
  // images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.tiff', '.ico', '.icns',
  // fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // archives and documents
  '.pdf', '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.jar',
  // audio and video
  '.mp3', '.mp4', '.m4a', '.mov', '.avi', '.webm', '.wav', '.ogg',
  // compiled and packed artefacts
  '.wasm', '.exe', '.dll', '.so', '.dylib', '.node', '.bin', '.class',
  '.pyc', '.pyo', '.db', '.sqlite', '.sqlite3',
  // key material
  '.p12', '.pfx', '.keystore',
]);

/**
 * The UNI-2660 measurement. A username component is required so a comment that
 * names the `/Users/` prefix alone is not an offender.
 */
export const HOME_PATH_RE = /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\//g;

/**
 * Known remaining offenders, allowlisted so this guard can be adopted today.
 *
 * Listed EXPLICITLY, file by file, rather than by excluding a directory — the
 * point of this guard is that such files are visible. An excluded folder would
 * hide the next one. Every entry has a written reason. Nothing executable is
 * allowlisted: the LaunchAgent plists under apps/workspace/deploy/ carry
 * install-time placeholders and are scanned like any other file. What remains
 * is docs, captured logs and one third-party documentation snapshot.
 */
const ALLOWLIST = new Map([
  [
    '.claude/skills/brand-video/SKILL.md',
    'operator note citing a founder-machine path as historical context',
  ],
  [
    '.claude/skills/fable-prompt-engineer/playbooks/convergence.md',
    'operator note citing a founder-machine path as historical context',
  ],
  [
    '.handoff-logs/handoff-20260702-214137.log',
    'historical captured local command output; not executable',
  ],
  [
    '.handoff-logs/handoff-20260709-131847.log',
    'historical captured local command output; not executable',
  ],
  [
    '.spm/2026-07-17-mission-control-phase1-foundation.md',
    'operator note citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/SOURCES.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/MARGOT-COMMAND-CENTER.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/MARGOT-ORCHESTRATOR.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/OVERNIGHT-AUTONOMY-MANDATE.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/disaster-recovery-assessment.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/forward-readiness-gap-analysis.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/high-level-crm-25-step-forecast.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/linear-watch-today.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/mac-mini-recovery-status.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/margot/orchestrator-prompt.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/operations/runbook-1password-vault-permissions.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/plans/2026-05-22-margot-overnight-superpowers-plan.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/plans/2026-05-23-margot-multi-day-crm-build-plan.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/plans/2026-05-25-personal-intelligence-second-assistant.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/runbooks/disaster-recovery.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/runbooks/environment-inventory.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/runbooks/mac-mini-recovery.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/runbooks/p0-quick-reference.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/security/audit-2026-05-31.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/spec/feature-coverage-matrix.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/spec/nexus-crm-task-ledger.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/superpowers/plans/2026-05-12-unite-group-security-sweep.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/superpowers/plans/2026-05-13-agent-empowerment-pathway-alignment.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/superpowers/plans/2026-05-14-agency-bot-pilot.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/docs/superpowers/plans/2026-05-18-runtime-reconciliation-implementation.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/empire/spec.md',
    'reference-only empire doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/PROJECT_DEFINITION_OF_DONE_ENGINE_RESULTS.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/docs/margot/high-level-crm-25-step-forecast.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/docs/margot/linear-watch-today.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    // Path is joined so this file does not reintroduce the retired product
    // name as a contiguous token (canonical-naming scans added lines).
    [
      'apps/web/docs/migration/unite-group-to-unite',
      '-hub-consolidation-plan.md',
    ].join(''),
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/docs/planning/OBSIDIAN_NEXUS_KNOWLEDGE_CONSOLE_PLAN.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/docs/plans/2026-03-07-kanban-implementation.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/docs/plans/2026-05-23-margot-multi-day-crm-build-plan.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/web/docs/synthex-scheduled-verify.md',
    'product doc citing a founder-machine path as historical context',
  ],
  [
    'apps/workspace/FEATURES-INVENTORY.md',
    'workspace doc citing a founder-machine path as historical context',
  ],
  [
    'apps/workspace/docs/swarm2-agent-ide-spec.md',
    'workspace doc citing a founder-machine path as historical context',
  ],
  [
    'apps/workspace/docs/swarm2-autopilot-orchestration-spec.md',
    'workspace doc citing a founder-machine path as historical context',
  ],
  [
    'apps/workspace/docs/swarm2-memory-framework-spec.md',
    'workspace doc citing a founder-machine path as historical context',
  ],
  [
    'apps/workspace/docs/swarm2-worker-lifecycle-compaction-spec.md',
    'workspace doc citing a founder-machine path as historical context',
  ],
  [
    'apps/workspace/docs/tool-artifacts-context-plan.md',
    'workspace doc citing a founder-machine path as historical context',
  ],
  [
    'docs/decisions/ARR-007-organisational-knowledge-and-doctrine.md',
    'documentation citing a founder-machine path as historical context',
  ],
  [
    'docs/decisions/UNI-2058-design-system-adoption-decision.md',
    'documentation citing a founder-machine path as historical context',
  ],
  [
    'docs/legacy/authority-site/SOURCES.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/MARGOT-COMMAND-CENTER.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/MARGOT-ORCHESTRATOR.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/OVERNIGHT-AUTONOMY-MANDATE.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/disaster-recovery-assessment.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/forward-readiness-gap-analysis.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/high-level-crm-25-step-forecast.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/linear-watch-today.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/mac-mini-recovery-status.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/margot/orchestrator-prompt.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/operations/runbook-1password-vault-permissions.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/plans/2026-05-22-margot-overnight-superpowers-plan.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/plans/2026-05-23-margot-multi-day-crm-build-plan.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/plans/2026-05-25-personal-intelligence-second-assistant.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/runbooks/disaster-recovery.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/runbooks/environment-inventory.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/runbooks/mac-mini-recovery.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/runbooks/p0-quick-reference.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/security/audit-2026-05-31.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/superpowers/plans/2026-05-12-unite-group-security-sweep.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/superpowers/plans/2026-05-13-agent-empowerment-pathway-alignment.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/superpowers/plans/2026-05-14-agency-bot-pilot.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/legacy/authority-site/superpowers/plans/2026-05-18-runtime-reconciliation-implementation.md',
    'legacy/history document; home path is cited evidence, not a runtime default',
  ],
  [
    'docs/plans/2026-07-10-automation-control-plane-phase1.md',
    'documentation citing a founder-machine path as historical context',
  ],
  [
    'docs/session-handoffs/handoff-20260702-214137.md',
    'session handoff citing a founder-machine path as historical evidence',
  ],
  [
    'docs/session-handoffs/handoff-20260705-201050-recovered.md',
    'session handoff citing a founder-machine path as historical evidence',
  ],
  [
    'docs/spec/feature-coverage-matrix.md',
    'spec citing a founder-machine vault or worktree as historical context',
  ],
  [
    'docs/spec/nexus-crm-task-ledger.md',
    'spec citing a founder-machine vault or worktree as historical context',
  ],
  [
    'docs/specs/2026-06-25-obsidian-connection-proof.md',
    'spec citing a founder-machine vault or worktree as historical context',
  ],
  [
    'docs/specs/2026-06-28-nexus-agentic-os-mission-control-spec.md',
    'spec citing a founder-machine vault or worktree as historical context',
  ],
  [
    'docs/vendor-intelligence/.snapshots/hermes.docs.cli-commands.txt',
    'third-party documentation snapshot; rewrite would drift from the captured source',
  ],
  [
    'packages/pi-ceo-operator-mcp/SPEC.md',
    'markdown citing a founder-machine path as historical context',
  ],
  [
    'spec.md',
    'markdown citing a founder-machine path as historical context',
  ],
]);

/**
 * Should this tracked path be scanned? Everything except a known binary format.
 *
 * The extension is taken from the BASENAME, not the whole path — same trap the
 * NUL-byte guard shipped with (`foo.d/Makefile` has no extension).
 * A leading dot is a hidden file (`.gitignore`), not an extension.
 */
export function shouldScan(path) {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return true;
  return !BINARY_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

export function allowlistReason(path) {
  return ALLOWLIST.get(path) ?? null;
}

export function allowlistedPaths() {
  return [...ALLOWLIST.keys()];
}

/** Scan the given paths, returning one entry per offending file. */
export function findOffenders(paths) {
  const offenders = [];
  for (const f of paths) {
    let text;
    try {
      if (!statSync(f).isFile()) continue;
      text = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const re = new RegExp(HOME_PATH_RE.source, 'g');
    const matches = text.match(re);
    if (!matches) continue;
    const idx = text.search(new RegExp(HOME_PATH_RE.source));
    const line = text.slice(0, idx).split('\n').length;
    offenders.push({ file: f, line, count: matches.length, sample: matches[0] });
  }
  return offenders;
}

/**
 * Index entries this guard is responsible for: `{ mode, sha, path }`.
 *
 * NUL-delimited on purpose. Plain `git ls-files` C-quotes any path holding a
 * non-ASCII byte, a quote or a newline, and the quoted form names no file on
 * disk — so every such file used to be skipped and the scan still said clean.
 * Submodules (mode 160000) carry no content of their own.
 */
export function trackedEntries() {
  return execSync('git ls-files -s -z', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean)
    .map((rec) => {
      const m = /^(\d{6}) ([0-9a-f]+) \d\t([\s\S]+)$/.exec(rec);
      if (!m) throw new Error(`unparseable git ls-files record: ${JSON.stringify(rec)}`);
      return { mode: m[1], sha: m[2], path: m[3] };
    })
    .filter((e) => e.mode !== '160000')
    // A symlink's target is TEXT whatever the name says, so the binary-extension
    // skip applies to regular-file content only. That holds for the index entry
    // (link.png -> /Users/…) AND for the working tree, where an unstaged edit can
    // turn a tracked image into a symlink without changing the index mode.
    .filter((e) => e.mode === '120000' || shouldScan(e.path) || isWorkingTreeSymlink(e.path))
    .filter((e) => !ALLOWLIST.has(e.path));
}

function isWorkingTreeSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

/** Tracked paths this guard is responsible for. */
export function trackedScannablePaths() {
  return trackedEntries().map((e) => e.path);
}

/** Every blob's content from the index, in one `git cat-file --batch` pass. */
function indexBlobs(shas) {
  const unique = [...new Set(shas)];
  const out = execSync('git cat-file --batch', {
    input: unique.join('\n') + '\n',
    maxBuffer: 1024 * 1024 * 1024,
  });
  const blobs = new Map();
  let pos = 0;
  for (const sha of unique) {
    const nl = out.indexOf(0x0a, pos);
    const header = out.subarray(pos, nl).toString('utf8');
    const m = /^([0-9a-f]+) blob (\d+)$/.exec(header);
    if (!m || m[1] !== sha) throw new Error(`git cat-file returned ${JSON.stringify(header)} for ${sha}`);
    const size = Number(m[2]);
    blobs.set(sha, out.subarray(nl + 1, nl + 1 + size).toString('utf8'));
    pos = nl + 1 + size + 1;
  }
  return blobs;
}

/**
 * Scan what is TRACKED, not only what happens to be on disk.
 *
 * Each entry is judged on its index blob — for a symlink that blob is the link
 * target text, which following the link with readFileSync never sees — and, when
 * the working-tree copy exists, on that copy too (link text for a symlink), so an
 * unstaged edit is caught before it is committed. A deleted-but-indexed file is
 * still scanned through its blob. Nothing is skipped silently.
 */
export function findTrackedOffenders(entries) {
  const blobs = indexBlobs(entries.map((e) => e.sha));
  const offenders = [];
  for (const e of entries) {
    // Content is text when it is link target text or a non-binary file; binary
    // image/font/etc. bytes are never pattern-matched, on either side.
    const texts = e.mode === '120000' || shouldScan(e.path) ? [blobs.get(e.sha)] : [];
    try {
      const st = lstatSync(e.path);
      if (st.isSymbolicLink()) texts.push(readlinkSync(e.path));
      else if (st.isFile() && shouldScan(e.path)) texts.push(readFileSync(e.path, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    for (const text of texts) {
      const matches = text.match(new RegExp(HOME_PATH_RE.source, 'g'));
      if (!matches) continue;
      const idx = text.search(new RegExp(HOME_PATH_RE.source));
      const line = text.slice(0, idx).split('\n').length;
      offenders.push({ file: e.path, line, count: matches.length, sample: matches[0] });
      break;
    }
  }
  return offenders;
}

export function main() {
  const entries = trackedEntries();
  const files = entries.map((e) => e.path);
  const offenders = findTrackedOffenders(entries);

  if (offenders.length === 0) {
    console.log(
      `home-path guard: clean (${files.length} tracked files; ${ALLOWLIST.size} allowlisted)`,
    );
    return 0;
  }

  console.error('ABSOLUTE HOME PATHS FOUND — tracked files must not embed /Users/<name>/ or /home/<name>/:\n');
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  (${o.count} hit${o.count === 1 ? '' : 's'}; sample ${o.sample})`);
  }
  console.error('\nRemove or parameterise the path, or add an explicit ALLOWLIST entry with a written reason.');
  return 1;
}

// Only run when invoked directly. Without this, importing the module for a test
// would execute the whole scan and call process.exit out from under the runner.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
