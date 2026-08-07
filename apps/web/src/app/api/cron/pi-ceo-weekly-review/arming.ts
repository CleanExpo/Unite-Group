// UNI-2373 P9 — the weekly review's arming gate (DORMANT by default).
//
// The weekly review is registered in no scheduler (vercel.json has 31 crons and
// this route is not among them — the 16/07 break-sweep logged that as D015). It
// therefore only ever runs when invoked directly. Merging this route's fixes must
// still arm nothing, so dispatch is gated twice per `nexus-conventions`:
//   1. Admission — `assertCronAuth` (CRON_SECRET), already enforced by the route.
//   2. Arming flag — `PI_CEO_WEEKLY_REVIEW_LIVE`, default off, flipped only at
//      founder/Board go-live *together with* the vercel.json cron registration.
// Unarmed, the route performs zero writes and reports honestly that it was
// dormant — it does not fabricate a brief and does not 500.

/** The founder/Board go-live flip. Unset/anything but '1' ⇒ no writes (prod default). */
export function isWeeklyReviewArmed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PI_CEO_WEEKLY_REVIEW_LIVE === '1'
}
