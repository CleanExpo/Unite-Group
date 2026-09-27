// scripts/nexus-runner/authority-prompt.mjs
//
// UNI-2779 — renders the runner's AUTHORITY block from mission-authority.json.
// Pure: same policy in, same text out. The runner prompt must never hand-write
// these rules again; a hand-written "never deploy" once contradicted the
// preview build step the policy grants.

/** @param {Record<string, string>} map @param {string} name */
function entries(map, name) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error(`mission authority policy has no ${name} map`)
  return Object.entries(map)
}

/**
 * @param {{ schema: string, build: Record<string, string>, protected: Record<string, string>, protected_descriptions: Record<string, string> }} policy
 * @returns {string}
 */
export function renderAuthorityBlock(policy) {
  const build = entries(policy.build, 'build')
  const protectedActions = entries(policy.protected, 'protected')
  const descriptions = policy.protected_descriptions ?? {}
  const undocumented = protectedActions.filter(([action]) => typeof descriptions[action] !== 'string' || !descriptions[action].trim())
  if (undocumented.length) {
    throw new Error(`protected action(s) without a description: ${undocumented.map(([action]) => action).join(', ')}`)
  }
  return [
    `AUTHORITY (${policy.schema} — rendered from scripts/nexus-runner/mission-authority.json):`,
    'This mission is BUILD_AUTHORISED — do not stop to ask the founder before any build step.',
    'Build steps you take on your own, in any order, as often as needed:',
    ...build.map(([action, description]) => `- ${action}: ${description}`),
    'On a failed test, review or CI check, diagnose, repair and retry yourself. Never ask "shall I continue" — continue.',
    'Escalate ONLY these protected actions. Stop before them and report; never perform them:',
    ...protectedActions.map(([action]) => `- ${action}: ${descriptions[action]}`),
    'You never deploy to production. Preview deploys are allowed (non-production only).',
    'The bin/ shims refuse every protected action with exit 3; treat that refusal as the boundary, not as a tool to work around.',
  ].join('\n')
}
