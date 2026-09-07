/**
 * Ordering for the Business Coaching flyout.
 *
 * The founder's requirement is explicit: clients appear as
 * "Business Name - Client Name" in alphabetical order.
 *
 * The database query already orders, but Postgres collation is not the same
 * ordering a reader expects — depending on the column's collation, "apex" can
 * sort after "Zenith" (C collation compares raw bytes, so all uppercase
 * precedes all lowercase). Sorting again here makes the rendered order
 * deterministic and independent of database configuration, and makes the
 * requirement testable as a pure function.
 */

export interface SortableEngagement {
  business_name: string
  client_name: string
}

/** en-AU collator: case-insensitive, punctuation-aware, locale-correct. */
const collator = new Intl.Collator('en-AU', {
  sensitivity: 'base',
  numeric: true,
})

/**
 * Sorts by business name, then client name. Returns a new array; the input is
 * not mutated. Equal keys keep their incoming relative order (Array.prototype
 * .sort is stable in every engine this app runs on).
 */
export function sortEngagements<T extends SortableEngagement>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const byBusiness = collator.compare(a.business_name, b.business_name)
    if (byBusiness !== 0) return byBusiness
    return collator.compare(a.client_name, b.client_name)
  })
}
