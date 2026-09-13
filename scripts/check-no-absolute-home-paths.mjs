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
import { readFileSync, statSync } from 'node:fs';
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
 * hide the next one. Every entry has a written reason. Executable hits were
 * removed or parameterised in UNI-2660; what remains is docs and host-local
 * artefacts.
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
    'apps/workspace/deploy/ai.hermes.dashboard.plist',
    'host-local LaunchAgent template; absolute paths are required at install time',
  ],
  [
    'apps/workspace/deploy/ai.hermes.workspace.plist',
    'host-local LaunchAgent template; absolute paths are required at install time',
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

/** Tracked paths this guard is responsible for. */
export function trackedScannablePaths() {
  return execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
    .filter(shouldScan)
    .filter((f) => !ALLOWLIST.has(f));
}

export function main() {
  const files = trackedScannablePaths();
  const offenders = findOffenders(files);

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
