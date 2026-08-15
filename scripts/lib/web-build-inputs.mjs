/**
 * The complete set of repository paths whose contents can change an apps/web
 * build. ONE definition, two consumers, because a drift between them is a
 * silent production bug in either direction:
 *
 *   - scripts/preflight.mjs        decides whether to run `verify:web` locally
 *   - scripts/vercel-ignore-build.mjs  decides whether Vercel builds at all
 *
 * If this list were duplicated and the copies drifted, one of two things
 * happens: preflight passes a change that CI then fails (annoying), or Vercel
 * SKIPS a build that was actually needed and production silently serves stale
 * code (not annoying — a real incident). Hence the single source.
 *
 * WHY IT IS WIDER THAN apps/web/. The app's `prebuild` script runs
 * sync-portfolio-registry.mjs and sync-capability-registry.mjs before
 * `next build`. Those read from the REPO ROOT, outside apps/web entirely:
 *
 *   .portfolio/PORTFOLIO.yaml   → apps/web/data/command-centre/portfolio.yaml
 *   .claude/agents, .claude/skills, .mcp.json
 *                               → apps/web/data/command-centre/capabilities.json
 *
 * Runtime discovery of those is impossible — they sit outside apps/web's
 * output-file-tracing root — so they are baked in at build time. Editing a
 * skill definition therefore changes the shipped bundle without touching one
 * file under apps/web/. Verified against apps/web/scripts/sync-*-registry.mjs.
 */

/** Prefix matches — a changed path starting with any of these affects the build. */
export const WEB_BUILD_INPUTS = [
  'apps/web/',
  // The CI/local build wrapper that supplies the fixed placeholder environment.
  'scripts/verify-web-ci-build.mjs',
  // Repo-root prebuild inputs (see header).
  '.portfolio/',
  '.claude/agents/',
  '.claude/skills/',
  '.mcp.json',
];

/**
 * True when any changed path can affect an apps/web build.
 * @param {string[]} files repo-relative paths
 */
export function affectsWebBuild(files) {
  return files.some((f) => WEB_BUILD_INPUTS.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
}
