# FOUNDER QUEUE

The decisions only Phill can make, with their age in public. Latency here is the
most expensive thing in the build — most of these are minutes of founder time
holding up days of machine time.

## Rules

- Sessions may **APPEND** a row and **SURFACE** it. Sessions may never **decide**
  a row, and never **delete** one.
- A resolved row **moves** to the Resolved section with its decision text and
  date. It is not edited in place and not removed.
- **Age is computed, not hand-edited.** `node scripts/founder-queue.mjs --render`
  rewrites the age column; a number typed into this file is overwritten.
- `Opened` is the date the decision was first recorded here, unless a dated
  source predates it — where a Linear ticket or `.spm/` file is the origin, that
  date is used and cited in Context.

## Open

| ID | Decision | Opened | Age (days) | Blocks | Context | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Flip the identity env var in prod | 2026-08-16 | 0 | identity cutover | Founder-only credential change; no agent may set it | open |
| F2 | Click Connect Google in the CRM Integrations panel | 2026-07-06 | 41 | UNI-2329, founder half of UNI-2344 | Per-founder OAuth into `credentials_vault`; client id/secret already in prod, so it is one consent click | open |
| F3 | Xero connection | 2026-08-16 | 0 | finance reporting | Founder-held credential; no agent path | open |
| F4 | Cost metering decision | 2026-08-16 | 0 | spend visibility | Which meter, and the cap that trips it | open |
| F5 | Provide LINEAR_API_KEY to prod | 2026-08-16 | 0 | Linear-backed automation | Founder-only secret | open |
| F6 | Retrieve/create the three social platform app secrets | 2026-07-06 | 41 | UNI-2331 | Connectors already built; only FACEBOOK_APP_SECRET, LINKEDIN_*, TIKTOK_* are missing | open |
| F7 | Stripe connection | 2026-08-16 | 0 | billing, and therefore the metric of record | Blocks paying customers directly | open |
| P9 | Sign off the arming checklist | 2026-08-07 | 9 | P9 go-live | Per `.spm/2026-08-07-p9-board-meetings-collision.md` | open |
| D19 | SPINE_DATABASE_URL vs ephemeral Postgres in CI | 2026-08-16 | 0 | UNI-2567 arming | Ephemeral Postgres is hermetic and kills the dependency permanently; a stored secret manages it forever | open |

## Resolved

| ID | Decision | Opened | Resolved | Decision text |
| --- | --- | --- | --- | --- |
