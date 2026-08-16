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

/**
 * Expand one cron field to the set of values it matches.
 * Handles "*", step ("star-slash-N"), lists ("1,3"), and ranges ("2-5").
 * @param {string} field
 * @param {number} min lowest legal value for this field
 * @param {number} max highest legal value for this field
 * @returns {Set<number>}
 */
export function expandField(field, min, max) {
  const out = new Set();
  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    let lo = min;
    let hi = max;
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(Number);
        lo = a;
        hi = b;
      } else {
        lo = Number(range);
        // A bare value with a step ("5/10") means "from 5 to the end, every 10".
        hi = stepRaw ? max : lo;
      }
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

  const minutes = expandField(minute, 0, 59).size;
  const hours = expandField(hour, 0, 23).size;
  const days = expandField(dow, 0, 6).size; // 7 when '*'

  // Matching minutes across a week, averaged back to a single day. Going via
  // the week is what makes a day-of-week restriction cost correctly: a weekly
  // cron is 1/7 of a day, not 1 a day.
  return (minutes * hours * days) / 7;
}
