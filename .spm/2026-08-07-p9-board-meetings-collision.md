# P9 — the `board_meetings` collision: schema decision (founder/Board-gated)

**Status:** DESIGN ONLY. No migration is written or applied by this PR.
**Context:** UNI-2373 P9, §2a of `.spm/2026-07-15-ship-readiness-register.md`.
**Decision owner:** founder / Board. Root `CLAUDE.md` makes prod schema changes
human-gated; an agent may design the options, never apply one.

## The collision, verified against source

- `board_meetings` is `UNIQUE (founder_id, meeting_date)` —
  `apps/web/supabase/migrations/20260326000001_ceo_boardroom.sql:17`.
- The daily `ceo-board-meeting` cron is registered at `50 1 * * *` in
  `apps/web/vercel.json` — **every** day, Sunday included.
- The weekly `pi-ceo-weekly-review` route upserted the same
  `(founder_id, meeting_date = today)` key with `status: 'new'`, its own
  `brief_md`, `linear_data`, `github_data` and `metrics`.

So a scheduled weekly would have reset a founder's `reviewing`/`acted` status back
to `new` and overwritten the daily's brief and payload columns, leaving a hybrid
row. That is why P9 was re-graded AMBER-build and withdrawn on review.

`pi-ceo-weekly-review` is registered in **no** scheduler — it is not among the 31
crons in `apps/web/vercel.json`, not in a workflow, not in `pg_cron`. The 16/07
break-sweep logged this as D015. The collision is therefore latent, not live.

## Options

### A — `meeting_type` discriminator (the register's original assumption)

Add `meeting_type text NOT NULL DEFAULT 'daily'`, drop the existing unique
constraint, add `UNIQUE (founder_id, meeting_date, meeting_type)`.

- **Pro:** daily and weekly become fully independent rows; neither can ever touch
  the other; each keeps its own `status` lifecycle.
- **Con:** a migration on a live table, including a constraint swap. Every reader
  of `board_meetings` (the boardroom page, `/api/boardroom/meetings`) starts
  seeing two rows per Sunday and must be taught which is which, or the founder
  gets duplicate cards. Founder/Board-gated, and not small.

### B — `weekly_reviews` becomes the only weekly store, with its own reader

Stop writing `board_meetings` from the weekly entirely. `weekly_reviews` already
exists (`20260618010000_weekly_reviews.sql`) with the right shape.

- **Pro:** no migration at all; clean separation of concerns.
- **Con:** `weekly_reviews` has **no reader** today. This option is only honest if
  it ships with new boardroom UI, which is a larger piece of work than P9's
  remaining scope, and until that UI exists the weekly is invisible — the exact
  blocker 3 failure in a new costume.

### C — merge into the daily row, never clobber *(implemented in this PR)*

The weekly owns exactly one namespaced agenda key, `agenda.weekly`, and writes no
column the daily owns. `weekly_reviews` remains the authoritative store for the
full weekly markdown.

- **Pro:** no migration; no data loss; the weekly is immediately visible inside
  the existing card because `MeetingCard` renders `agenda` sections. Reversible —
  option A remains available later as a strict upgrade.
- **Con:** one row carries two cadences, so the founder acts on a single combined
  status rather than acknowledging the weekly separately. Read-modify-write on
  `agenda` is not atomic; the 23505 re-read path handles the daily inserting
  mid-flight, but two concurrent *weekly* runs are not defended against (there is
  only one weekly, so this is not reachable today).

## Recommendation

**Ship C now; keep A as the founder/Board upgrade if the weekly ever needs its own
acknowledgement lifecycle.** C removes the data-destruction blocker without a
migration and makes the weekly genuinely visible today. B is rejected: it trades a
visible collision for an invisible brief.

## What is explicitly NOT in this PR

1. Any migration, on any table.
2. The `apps/web/vercel.json` cron registration. Scheduling the weekly is the
   founder/Board go-live act, not a merge side-effect.
3. Flipping `PI_CEO_WEEKLY_REVIEW_LIVE`.

## Arming checklist (founder/Board, when going live)

1. Decide A vs C above. If A, the migration ships separately and is applied via
   the standard migration path first.
2. Set `PI_CEO_WEEKLY_REVIEW_LIVE=1` in the Vercel production environment.
3. Invoke `/api/cron/pi-ceo-weekly-review` manually with the `CRON_SECRET` and
   confirm the response carries `armed: true, persisted: true` and a `meetingId`.
4. Confirm the boardroom card for that date shows a **Weekly review** section and
   that the daily's own sections and status are unchanged.
5. Only then add the cron entry to `apps/web/vercel.json`. Chosen schedule must
   not collide with `50 1 * * *`; the route's header comment assumes Sunday 20:00
   UTC.
6. Rollback: unset `PI_CEO_WEEKLY_REVIEW_LIVE` and remove the cron entry. The
   route returns to writing nothing. No schema to unwind under option C.
