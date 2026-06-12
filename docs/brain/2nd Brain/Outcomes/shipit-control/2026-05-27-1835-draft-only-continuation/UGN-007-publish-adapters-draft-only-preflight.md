# UGN-007 — Publish adapters draft-only preflight

Created: 2026-05-27T18:42:53+10:00
Status: DONE_INTERNAL_PREFLIGHT
Approval scope: internal artifact generation only.
External channel rule: do not connect, authenticate, schedule, or publish to LinkedIn, X/Twitter, CMS, or any external channel.

## Decision
This preflight is a local checklist/matrix only. It intentionally does not validate live credentials, OAuth scopes, target identities, posting profiles, CMS targets, APIs, schedulers, or channel connection state.

## Environment key checklist (names only; no secret lookup performed)

| Channel | Potential key/config names to document later | Draft-only status |
|---|---|---|
| LinkedIn | LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORGANIZATION_ID or person URN | NOT_CHECKED_BY_POLICY |
| X/Twitter | X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, X_BEARER_TOKEN, posting profile/account name | NOT_CHECKED_BY_POLICY |
| CMS/blog | CMS_BASE_URL, CMS_API_TOKEN, CMS_SITE_ID, CMS_COLLECTION_ID or canonical blog target | NOT_CHECKED_BY_POLICY |
| Internal queue | local packet path, approval status, source artifact path, reviewer | OK_FOR_DRAFT_ONLY |

## Auth test pass/fail matrix

| Stage | LinkedIn | X/Twitter | CMS/blog | Notes |
|---|---|---|---|---|
| Credential presence | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | No secret/env probing for unapproved channels. |
| Target identity/profile | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | No external profile, org, or site validation. |
| API reachability | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | No API calls. |
| Scheduler readiness | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | NOT_TESTED_BY_POLICY | No scheduling. |
| Public publish path | NEED_APPROVAL | NEED_APPROVAL | NEED_APPROVAL | Phill approval required before live work. |
| Internal packet generation | PASS | PASS | PASS | Local draft artifacts only. |

## Missing fields list before any future live approval
- Explicit channel approval from Phill naming the channel(s).
- Canonical target identity for each approved channel: LinkedIn person/org, X account/profile, CMS site/collection/blog.
- Approved credential storage location and scope boundaries.
- Required review state: APPROVED_FOR_PUBLISH, not just APPROVE_TO_QUEUE/draft-only.
- Rollback/removal path for each channel.
- Audit evidence path for any future connection or publish test.

## Fallback plan now
- Generate local publish packets and review drafts only.
- Store artifacts in 2nd-brain outcomes and/or approved repos.
- Use GitHub/Linear/local files for tracking where available.
- Keep all external channel work in NEED_APPROVAL until Phill explicitly authorizes it.
