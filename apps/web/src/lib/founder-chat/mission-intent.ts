// src/lib/founder-chat/mission-intent.ts
// Deterministic classifier for one founder chat turn (Mission Control chat W1a).
// No model call, no IO. It decides only whether a turn may be RECORDED as a
// proposed draft; it never sets status, approval or any other authority.
//
// Rules (spec §9):
//   - any release/deploy/merge/publish/delete/pay/approve/push/ship/launch
//     wording → unsupported_action, even inside a build request
//     ("Build X and deploy it"), so nothing is recorded or started;
//   - an imperative build verb FIRST and a work object somewhere → build_request;
//   - anything else, or anything uncertain (a question) → question.
// Every pattern is a flat alternation with no nested quantifiers, and the input
// is capped, so classification stays linear on adversarial text (AC-20).

export type MissionIntentKind = 'build_request' | 'question' | 'unsupported_action'

export const MAX_CLASSIFY_CHARS = 8000

const UNSUPPORTED_ACTION =
  /\b(?:release[sd]?|releasing|deploy(?:s|ed|ing|ment|ments)?|merge[sd]?|merging|publish(?:es|ed|ing)?|delete[sd]?|deleting|pay|pays|paying|paid|payment|payments|approve[sd]?|approving|approval|push(?:es|ed|ing)?|ship(?:s|ped|ping)?|launch(?:es|ed|ing)?)\b/

// Imperative verb must open the turn (optionally after "please").
const BUILD_VERB_FIRST =
  /^(?:please\s+)?(?:build|create|add|implement|fix|make|write|set up|wire up|scaffold|refactor|update|improve|design|develop|extend|rename|change)\b/

// A concrete piece of work the verb acts on.
const WORK_OBJECT =
  /\b(?:page|pages|feature|features|endpoint|endpoints|api|route|routes|component|components|button|buttons|form|forms|report|reports|dashboard|dashboards|screen|screens|view|views|integration|integrations|script|scripts|workflow|workflows|tool|tools|module|modules|function|functions|service|services|bug|bugs|card|cards|table|tables|field|fields|filter|filters|export|import|template|templates|widget|widgets|panel|panels|section|sections|modal|modals|chart|charts|sidebar|menu|tab|tabs|notification|notifications|webhook|webhooks|pipeline|pipelines|checklist|tests|test suite|landing page|login|search|flow|flows|list|lists|app|site|website)\b/

export function classifyMissionIntent(raw: string): MissionIntentKind {
  const text = raw.slice(0, MAX_CLASSIFY_CHARS).trim().toLowerCase().replace(/\s+/g, ' ')
  if (text.length === 0) return 'question'
  if (UNSUPPORTED_ACTION.test(text)) return 'unsupported_action'
  const imperativeBuild = !text.endsWith('?') && BUILD_VERB_FIRST.test(text) && WORK_OBJECT.test(text)
  return imperativeBuild ? 'build_request' : 'question'
}
