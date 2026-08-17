/**
 * Review roles — perspective diversity instead of N clones.
 *
 * WHY THIS EXISTS. Phase 1 sent every model the same reviewer prompt, so a
 * five-model swarm was five draws from one distribution. Redundancy of that kind
 * raises confidence in what the prompt already looks for and cannot find
 * anything it does not look for: if the prompt does not think to ask "what
 * happens when this list is empty", no amount of parallelism will ask it.
 *
 * The three roles below are the three jobs actually wanted from a second
 * opinion — check the claim, attack the design, surface the unknowns — and they
 * fail differently, which is the point. REFUTE is separate: it runs in the
 * second stage, against findings rather than against code.
 *
 * All roles share one output SHAPE so the existing clusterer works unchanged;
 * only the permitted `severity` values differ, so the question role can emit the
 * value its own classifier looks for. Routing is by ROLE, not by that value —
 * see isQuestion.
 */

const schemaFor = (severities) => `Return STRICT JSON, no prose, no markdown fence:
{"findings":[{"file":"path","line":123,"severity":"${severities}","claim":"one sentence","why":"how it fails concretely"}]}

Return {"findings":[]} if you have nothing real. An empty list is a valid and useful answer.`;

const SCHEMA = schemaFor('critical|high|medium|low');

/**
 * The question role's schema must permit the severity its own handler looks for.
 *
 * The shared schema listed only defect severities, so a model that followed the
 * prompt CORRECTLY emitted `severity: "high"` for a question — and the question
 * filter, which keys off `severity === "question"`, then let it through to the
 * claims pile where it could count towards quorum. Two questions could become a
 * corroborated finding. The prompt contradicted its own classifier.
 */
const QUESTION_SCHEMA = schemaFor('question');

export const ROLES = {
  /**
   * The Phase 1 reviewer, kept as-is. It is the baseline the others are
   * measured against, and its prompt is the one the benchmark corpus was
   * written for.
   */
  defect: {
    label: 'defect',
    describe: 'double-checks the change for concrete bugs',
    system: `You are a rigorous code reviewer giving a SECOND OPINION on a change another reviewer has already approved.

Report only defects you can point at in the diff shown. Do not report style preferences, naming, or missing tests unless the absence causes a concrete failure.

Prioritise:
- logic that silently produces a WRONG value rather than an error
- concurrency, retries, and partial failure
- database queries: ordering, pagination, boundaries, uniqueness
- serverless lifecycle: work that may not complete after a response is sent
- tests that assert less than their name claims

${SCHEMA}`,
  },

  /**
   * Attacks the change rather than reading it.
   *
   * Deliberately told the code is correct as written, because "find the bug"
   * and "find the input that breaks this" are different searches. The second
   * finds empty collections, zero, negative, unicode, clock skew, concurrent
   * callers — the class of defect that reads perfectly fine line by line.
   */
  weakness: {
    label: 'weakness',
    describe: 'hunts for inputs and conditions that break the change',
    system: `You are a hostile reviewer. Assume the code shown is correct on the happy path and that the author has already tested it. Your job is to find the conditions under which it fails anyway.

Work from the failure backwards. For each claim, name the specific input, state, timing or scale that triggers it.

Hunt for:
- boundary values: empty, zero, one, negative, maximum, null vs absent
- concurrency: two callers at once, retries, partial writes, crash between two steps
- scale: what changes at 10,000 rows that is fine at 10
- time: timezones, DST, month ends, clock skew, expiry
- trust: values that are free text, user-supplied, or from another system

Do not report anything you cannot tie to a concrete triggering condition. A weakness without a trigger is a guess.

${SCHEMA}`,
  },

  /**
   * Surfaces unknowns rather than asserting defects.
   *
   * The cheapest thing a second opinion can do is notice what the first opinion
   * assumed. A question is not a finding and must never be promoted into one —
   * it is routed to its own section and never enters the quorum, because
   * counting questions as votes would let uncertainty masquerade as consensus.
   */
  question: {
    label: 'question',
    describe: 'asks what the change assumes without saying',
    system: `You are a senior reviewer who has not seen this system before. Your job is to ask the questions whose answers would change whether this change is correct — not to guess the answers.

Ask about:
- assumptions the code makes that are not stated or checked
- invariants it relies on that nothing in the diff enforces
- what happens to existing data, callers, or in-flight work
- how a reader would know this is working, or failing, in production
- what the change does NOT do that its description implies it does

Ask only questions where a wrong answer means a real problem. Do not ask questions whose answer is visible in the diff.

Put the question in "claim" and what goes wrong if the answer is bad in "why".

${QUESTION_SCHEMA}`,
  },
};

/**
 * The adversary for stage two.
 *
 * Prompted to REFUTE rather than to assess, and told to default to refuted when
 * unsure. Both are deliberate: "is this finding correct?" invites agreement from
 * a model that has just been shown a confident claim, and an even split should
 * fall towards dropping the finding, because the cost of a false finding here is
 * a human's attention — the exact resource this tool exists to protect.
 */
export const REFUTE = {
  label: 'refute',
  system: `You are checking whether a specific code-review finding is REAL. Another model claimed it. Your job is to refute it.

The finding is wrong if any of these hold:
- the code it describes is not present in the diff shown
- the failure it describes cannot actually occur, given the code shown
- it describes intended behaviour, a style preference, or a hypothetical the diff does not create
- it misreads what the code does

You have only the diff. If the diff does not contain enough to judge, the finding is NOT supported — say refuted.

Return STRICT JSON, no prose, no markdown fence:
{"refuted": true|false, "reason": "one sentence"}

Default to {"refuted": true} when you are unsure.`,
};

/** Role keys usable in stage one, in a stable order. */
export const REVIEW_ROLES = ['defect', 'weakness', 'question'];

/**
 * Questions never count towards corroboration.
 *
 * Exported as a predicate rather than inlined so the rule is testable and has
 * exactly one definition. A question promoted to a finding by an off-by-one in
 * a filter would let "I don't know" become "two models agree".
 */
export const isQuestion = (f) =>
  // The ROLE is authoritative; the severity is model-supplied. Relying on the
  // severity alone meant a question-role reply that ignored (or, before the
  // schema fix, correctly followed) the prompt landed in the claims pile and
  // could count towards quorum. Provenance is known; compliance is hoped for.
  f?._role === 'question' ||
  String(f?.severity ?? '').toLowerCase() === 'question';
