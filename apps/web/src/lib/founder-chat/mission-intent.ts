// src/lib/founder-chat/mission-intent.ts
// Deterministic classifier for one founder chat turn (Mission Control chat W1a).
// No model call, no IO. It decides only whether a turn may be RECORDED as a
// proposed draft; it never sets status, approval or any other authority.
//
// Rules (spec §9):
//   - a turn whose LEADING verb is a protected action (deploy, release, merge,
//     publish, delete, pay, approve, push, ship, launch, go live, promote,
//     execute, run … in production, migrate, drop, roll back, send) →
//     unsupported_action, so nothing is recorded or started;
//   - a build request that goes on to ask for a protected action in a later
//     clause ("Build X and deploy it", "…, then publish it") → unsupported_action;
//   - an imperative build verb FIRST whose own object is a piece of work (a work
//     noun within a few words of the verb, not "me"/"us"/"sense of"/"my …")
//     → build_request. "Build a payment page" is a build request: "payment" is
//     not a protected verb there, and every draft is born needing approval;
//   - anything else, including a question that merely mentions a protected word
//     ("Did the deploy finish?", "What's the payment status?") → question.
// Every pattern is a flat alternation with no nested quantifiers, and the input
// is capped, so classification stays linear on adversarial text (AC-20).

export type MissionIntentKind = 'build_request' | 'question' | 'unsupported_action'

export const MAX_CLASSIFY_CHARS = 8000

// Polite or directive openers that may come before a protected leading verb.
const OPENER =
  "(?:please |just |now |go ahead and |can you |could you |would you |will you |let's |lets )?"

const PROTECTED_VERB =
  '(?:release|deploy|merge|publish|delete|pay|approve|push|ship|launch|go live|promote|execute|migrate|drop|rollback|roll back|revert|send)'

// The turn OPENS with a protected action.
const PROTECTED_LEADING = new RegExp(`^${OPENER}${PROTECTED_VERB}\\b`)
// "Run … in production" opens with run and targets production.
const RUN_IN_PRODUCTION = /^(?:please )?run\b[^?]*\b(?:in|on|against|to) (?:prod|production)\b/
// A later clause of a build request asks for a protected action.
const PROTECTED_CLAUSE = new RegExp(`(?:\\band|\\bthen|[,;:]|\\balso) (?:then |also |immediately )?${PROTECTED_VERB}\\b`)

// Imperative verb must open the turn (optionally after "please").
const BUILD_VERB_FIRST =
  /^(?:please\s+)?(?:build|create|add|implement|fix|make|write|set up|wire up|scaffold|refactor|update|improve|design|develop|extend|rename|change)\b/

// A concrete piece of work the verb acts on.
const WORK_OBJECT =
  /\b(?:page|pages|feature|features|endpoint|endpoints|api|route|routes|component|components|button|buttons|form|forms|report|reports|dashboard|dashboards|screen|screens|view|views|integration|integrations|script|scripts|workflow|workflows|tool|tools|module|modules|function|functions|service|services|bug|bugs|card|cards|table|tables|field|fields|filter|filters|export|import|template|templates|widget|widgets|panel|panels|section|sections|modal|modals|chart|charts|sidebar|menu|tab|tabs|notification|notifications|webhook|webhooks|pipeline|pipelines|checklist|tests|test suite|landing page|login|search|flow|flows|list|lists|app|site|website)\b/

// The verb's object is the founder, not a piece of work: "Update me on…",
// "Write me a…", "Make sense of…", "Fix my understanding of…".
const SELF_OBJECT =
  /^(?:me|us|myself|ourselves|sense|my (?:understanding|thinking|mind|head|day)|our (?:understanding|thinking))\b/

/** How many words after the verb its work noun may sit. */
const OBJECT_WINDOW_WORDS = 6

function aimsAtWork(text: string): boolean {
  const verb = BUILD_VERB_FIRST.exec(text)
  if (!verb) return false
  const rest = text.slice(verb[0].length).trimStart()
  if (SELF_OBJECT.test(rest)) return false
  return WORK_OBJECT.test(rest.split(' ', OBJECT_WINDOW_WORDS).join(' '))
}

export function classifyMissionIntent(raw: string): MissionIntentKind {
  const text = raw.slice(0, MAX_CLASSIFY_CHARS).trim().toLowerCase().replace(/\s+/g, ' ')
  if (text.length === 0) return 'question'
  if (PROTECTED_LEADING.test(text) || RUN_IN_PRODUCTION.test(text)) return 'unsupported_action'
  const imperativeBuild = !text.endsWith('?') && aimsAtWork(text)
  if (imperativeBuild && PROTECTED_CLAUSE.test(text)) return 'unsupported_action'
  return imperativeBuild ? 'build_request' : 'question'
}
