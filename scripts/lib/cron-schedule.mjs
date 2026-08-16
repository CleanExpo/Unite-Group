/**
 * Cron schedule arithmetic — how often a 5-field expression actually fires.
 *
 * Extracted from scripts/cron-cost-audit.mjs so the maths can be tested against
 * SYNTHETIC expressions rather than whatever happens to be in vercel.json.
 *
 * The first version of these tests asserted things like "video-status is every
 * 5 minutes, therefore 288/day". That coupled a test of the ARITHMETIC to a
 * product decision about SCHEDULING, so the first genuine schedule change broke
 * two tests that had nothing to do with what changed. Cost arithmetic is a
 * fixed property of cron syntax; the schedules are not. They are tested apart
 * now: the maths against fixed expressions here, and the live config against
 * invariants that survive any reschedule (every cron resolves to a route, every
 * schedule is costed, the total equals the sum of its parts).
 */

/** True for a string that is a plain non-negative integer. */
function isIntStr(s) {
  return /^\d+$/.test(s);
}

/**
 * Expand one cron field to the set of values it matches.
 * Handles "*", step ("star-slash-N"), lists ("1,3"), and ranges ("2-5").
 *
 * Returns null for anything malformed rather than a wrong answer. Every input
 * is validated BEFORE the value loop is entered, because the loop is where
 * malformed input does real damage:
 *
 *   - a zero step ("star-slash-0") never increments, so the loop never
 *     terminates — the audit hangs rather than failing;
 *   - a non-numeric step used to yield NaN, which exits the loop immediately
 *     and silently reported the un-stepped count (24/day instead of null);
 *   - a reversed range ("5-1") with min/max swapped ran away until Node threw
 *     "Set maximum size exceeded".
 *
 * All three were live defects, found by review on PR #1005 and reproduced
 * before this guard was written.
 *
 * @param {string} field
 * @param {number} min lowest legal value for this field
 * @param {number} max highest legal value for this field
 * @returns {Set<number>|null} matching values, or null if the field is invalid
 */
export function expandField(field, min, max) {
  const out = new Set();
  for (const part of String(field).split(',')) {
    const bits = part.split('/');
    if (bits.length > 2) return null; // "1/2/3"
    const [range, stepRaw] = bits;

    let step = 1;
    if (stepRaw !== undefined) {
      if (!isIntStr(stepRaw)) return null; // non-numeric or signed step
      step = Number(stepRaw);
      if (step < 1) return null; // a zero step would never terminate
    }

    let lo = min;
    let hi = max;
    if (range !== '*') {
      if (range.includes('-')) {
        const ends = range.split('-');
        if (ends.length !== 2 || !ends.every(isIntStr)) return null;
        [lo, hi] = ends.map(Number);
        if (lo > hi) return null; // reversed range
      } else {
        if (!isIntStr(range)) return null;
        lo = Number(range);
        // A bare value with a step ("5/10") means "from 5 to the end, every 10".
        hi = stepRaw !== undefined ? max : lo;
      }
      if (lo < min || hi > max) return null; // out of range for this field
    }

    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

/**
 * Average invocations per day for a 5-field cron expression.
 *
 * Returns null when day-of-month or month is restricted, rather than guessing.
 * Every schedule currently in vercel.json leaves both unrestricted, and a
 * caller that silently costed a restricted schedule wrong would understate
 * spend — so this refuses instead, and the audit surfaces the refusal.
 *
 * @param {string} expr e.g. "0 16 * * *"
 * @returns {number|null} invocations per day, or null if not costable
 */
export function invocationsPerDay(expr) {
  const parts = String(expr).trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dom, month, dow] = parts;
  if (dom !== '*' || month !== '*') return null;

  const minuteSet = expandField(minute, 0, 59);
  const hourSet = expandField(hour, 0, 23);
  const dowSet = expandField(dow, 0, 6);
  // A malformed field makes the whole expression uncostable — never partly.
  if (!minuteSet || !hourSet || !dowSet) return null;

  const minutes = minuteSet.size;
  const hours = hourSet.size;
  const days = dowSet.size; // 7 when '*'

  // Matching minutes across a week, averaged back to a single day. Going via
  // the week is what makes a day-of-week restriction cost correctly: a weekly
  // cron is 1/7 of a day, not 1 a day.
  return (minutes * hours * days) / 7;
}
