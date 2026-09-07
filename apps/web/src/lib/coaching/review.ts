/**
 * Review decisions for proposed extractions.
 *
 * The review screen is where a model's proposal becomes part of a client's
 * record, so this is the one place where "close enough" is not acceptable — an
 * approved extraction is later read back as something the client actually said.
 *
 * THE CORRECTION LOG is the reason this is not a two-line status update.
 * `original_body` holds what the MODEL first proposed; `body` holds what the
 * founder settled on. The pair is the eval dataset, captured as a by-product of
 * review rather than as a separate labelling chore (see the migration comment on
 * coaching_extractions.original_body). Two rules follow from that:
 *
 *   1. `original_body` is written only on a genuine edit. Approving text
 *      unchanged must NOT copy body into original_body, or every row looks like
 *      a correction and the dataset is worthless.
 *   2. `original_body`, once set, is NEVER overwritten. A second edit refines
 *      the founder's wording; the model's first attempt is still the thing
 *      being measured.
 */

export type ReviewAction = 'approve' | 'reject'

/** The columns a decision reads. Deliberately narrow — this is not the row type. */
export interface ReviewableExtraction {
  id: string
  status: string
  body: string
  original_body: string | null
}

export interface ReviewPatch {
  status: 'approved' | 'rejected'
  reviewed_at: string
  body?: string
  original_body?: string
}

export class NotReviewableError extends Error {
  constructor(status: string) {
    super(`only a proposed extraction can be reviewed — this one is "${status}"`)
    this.name = 'NotReviewableError'
  }
}

/** Trailing/leading whitespace is not an edit. Internal whitespace is left alone. */
function normalise(text: string): string {
  return text.trim()
}

/**
 * Build the database patch for one review decision.
 *
 * @param row      the extraction as it currently stands
 * @param action   approve or reject
 * @param editedBody  the founder's text. Undefined means "unchanged".
 * @param now      injected so the caller owns the clock and tests are stable
 */
export function buildReviewPatch(
  row: ReviewableExtraction,
  action: ReviewAction,
  editedBody: string | undefined,
  now: Date = new Date(),
): ReviewPatch {
  if (row.status !== 'proposed') throw new NotReviewableError(row.status)

  const reviewed_at = now.toISOString()

  if (action === 'reject') {
    // A rejected row keeps its body. The record of what the model got wrong is
    // the point of keeping it at all — deleting it would erase the evidence.
    return { status: 'rejected', reviewed_at }
  }

  const next = editedBody === undefined ? row.body : normalise(editedBody)

  if (next.length === 0) {
    throw new Error('an approved extraction cannot have an empty body')
  }

  if (next === normalise(row.body)) {
    // Approved as proposed — no correction to log.
    return { status: 'approved', reviewed_at }
  }

  return {
    status: 'approved',
    reviewed_at,
    body: next,
    // Rule 2: preserve the model's FIRST text, not the previous edit.
    original_body: row.original_body ?? row.body,
  }
}

/** True when the founder's text differs from what is stored. Drives the UI diff. */
export function isEdited(row: ReviewableExtraction, editedBody: string): boolean {
  return normalise(editedBody) !== normalise(row.body)
}
