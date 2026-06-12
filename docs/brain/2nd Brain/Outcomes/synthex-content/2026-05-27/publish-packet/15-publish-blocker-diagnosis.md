# Publish blocker diagnosis — steps 11–13

Created: 2026-05-27 15:24:35 AEST
Inputs checked:
- 11-publish-authorization-sheet.md
- 12-scheduling-confirmation.md
- 13-publish-confirmation.md
- Local non-secret credential presence checks for LinkedIn, X/Twitter, and likely blog CMS providers

## 1) Exact stage failed

Primary failed stage: authorization

Evidence:
- 11-publish-authorization-sheet.md marks all six queued assets as `HOLD`.
- Zero assets are marked `APPROVED_FOR_PUBLISH`.
- 12-scheduling-confirmation.md therefore records zero scheduled assets and no external scheduler/CMS draft IDs.
- 13-publish-confirmation.md therefore records no live URLs/post IDs and no publish confirmations.

Stage status:

| Stage | Status | Evidence |
|---|---|---|
| authorization | FAILED | All rows in 11 are `HOLD`; no `APPROVED_FOR_PUBLISH` rows. |
| scheduling | NOT REACHED / BLOCKED | 12 says zero approved rows; no scheduler/CMS draft IDs created. |
| channel connection | NOT REACHED FOR PUBLISH | No publish/schedule call attempted because authorization failed. Preflight shows channel setup gaps below. |
| publish API call | NOT REACHED | No external draft/post IDs exist, so no API publish confirmation could run. |

## 2) Missing credentials/tokens/scopes per channel

Credential checks did not print secrets. They only checked presence/config status.

### LinkedIn

Observed local env status:
- `LINKEDIN_ACCESS_TOKEN`: SET
- `LINKEDIN_CLIENT_ID`: MISSING
- `LINKEDIN_CLIENT_SECRET`: SET
- `LINKEDIN_ORGANIZATION_ID`: MISSING
- `LINKEDIN_PERSON_URN`: MISSING

Missing/unknown:
- Missing target identity: organization ID or person URN is required to know where to publish.
- Missing client ID prevents clean app/OAuth diagnosis/refresh flow.
- Token scopes are unknown from local env check. For LinkedIn posting, confirm the token/app has the appropriate LinkedIn posting permissions for the intended target, e.g. member/organization posting permissions applicable to the selected API product.
- No external scheduler/CMS draft ID exists for LinkedIn because scheduling never ran.

### X/Twitter

Observed local env status:
- `X_API_KEY`: SET
- `X_API_SECRET`: SET
- `X_ACCESS_TOKEN`: SET
- `X_ACCESS_TOKEN_SECRET`: SET
- `X_BEARER_TOKEN`: SET
- `xurl`: INSTALLED
- `xurl auth status`: no apps registered

Missing/unknown:
- xurl is not configured with a registered app/token profile in `~/.xurl` for Hermes tool subprocesses.
- OAuth app/account default is missing in xurl, so agent-safe X posting/scheduling cannot proceed through the documented xurl workflow.
- Token scopes are unknown from env-only checks. Confirm write/post scope for the intended X account.
- No external scheduler draft/post ID exists because scheduling never ran.

### Blog/editorial CMS

Observed local env status:
- `WORDPRESS_URL`: MISSING
- `WORDPRESS_USERNAME`: MISSING
- `WORDPRESS_APP_PASSWORD`: SET
- `WEBFLOW_API_TOKEN`: SET
- `WEBFLOW_SITE_ID`: MISSING
- `WEBFLOW_COLLECTION_ID`: MISSING
- `GHOST_ADMIN_API_KEY`: SET
- `GHOST_API_URL`: MISSING

Missing/unknown:
- The canonical CMS is not identified in the authorization/scheduling files.
- WordPress cannot be used with only an app password; URL and username are missing.
- Webflow cannot create an item without site/collection IDs.
- Ghost cannot be used without the Ghost API URL.
- CMS scopes/permissions are unknown because no CMS target was selected and no draft creation was attempted.

### Internal creative/ad concepts

Observed:
- Asset 06 is explicitly internal creative queue only.

Missing/unknown:
- Paid platform is not specified.
- Placement, budget, account, destination URL, creative format, and claims review are missing.
- No paid ads scheduler/ad-platform credentials were validated because the asset remains review-gated and not approved for paid/public launch.

## 3) Missing required fields per asset

| Asset | Missing required fields before public scheduling |
|---|---|
| 01-linkedin-approval-workflow-publish-packet.md | Status must be changed from `HOLD` to `APPROVED_FOR_PUBLISH`; final LinkedIn preview approval; target account/person/org; external scheduler or direct-post method. |
| 02-x-content-handoff-publish-packet.md | Status must be changed from `HOLD` to `APPROVED_FOR_PUBLISH`; final X preview/character check; target X account; xurl app/account configured or scheduler method selected. |
| 03-linkedin-platform-integrations-v2.md | Status must be changed from `HOLD` to `APPROVED_FOR_PUBLISH`; confirm queued v3 wording only; final LinkedIn preview approval; target account/person/org; external scheduler or direct-post method. |
| 04-x-performance-claim-v2.md | Status must be changed from `HOLD` to `APPROVED_FOR_PUBLISH`; final X preview/character check; target X account; xurl app/account configured or scheduler method selected. |
| 05-blog-content-operating-system-v2.md | Status must be changed from `HOLD` to `APPROVED_FOR_PUBLISH`; final editorial approval; CMS choice; CMS URL/site/collection; slug; excerpt/meta title if needed; link verification; CMS draft ID. |
| 06-ad-variant-set-v2.md | Not eligible for public/paid scheduling yet. Needs explicit paid/public launch approval, platform selection, placement, budget, account, destination URL, claims review, and ad-platform draft/campaign ID. |

## 4) Concrete fix commands/checklist

### A. Fix the actual blocker first: authorization

Edit `11-publish-authorization-sheet.md` and change only the assets approved for actual public scheduling:

- `HOLD` → `APPROVED_FOR_PUBLISH`
- Keep unapproved assets as `HOLD`
- For asset 06, only mark approved if paid/public launch has been explicitly approved; otherwise keep `HOLD`

Minimum approval checklist per row:
- Final caption/title approved.
- Proposed publish timestamp approved.
- Owner approved.
- Target channel/account approved.
- Required final edits completed.
- Public publish/schedule approval is explicit, not inferred from internal queue approval.

### B. LinkedIn checklist

Required before scheduling LinkedIn assets:
- Choose target: person profile or organization page.
- Set/record target ID:
  - `LINKEDIN_PERSON_URN` for person publishing, or
  - `LINKEDIN_ORGANIZATION_ID` for organization publishing.
- Ensure LinkedIn app/client config is available for token refresh/diagnosis:
  - `LINKEDIN_CLIENT_ID`
  - `LINKEDIN_CLIENT_SECRET`
  - valid `LINKEDIN_ACCESS_TOKEN`
- Confirm app/token has the needed posting permission for the chosen target.
- Create the external scheduler/direct-post draft and capture draft/post ID.

Non-secret verification command:

```bash
python3 - <<'PY'
import os
for k in ['LINKEDIN_ACCESS_TOKEN','LINKEDIN_CLIENT_ID','LINKEDIN_CLIENT_SECRET','LINKEDIN_ORGANIZATION_ID','LINKEDIN_PERSON_URN']:
    print(f'{k}=' + ('SET' if os.getenv(k) else 'MISSING'))
PY
```

### C. X/Twitter checklist

Required before scheduling X assets:
- Configure xurl app/profile outside the agent session; do not paste secrets into chat.
- Set default app/account in xurl.
- Verify xurl can identify the posting account.

User-run setup commands, with placeholders only:

```bash
xurl auth apps add synthex --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET
xurl auth oauth2 --app synthex YOUR_USERNAME
xurl auth default synthex YOUR_USERNAME
xurl auth status
xurl whoami
```

Agent-safe verification after setup:

```bash
xurl auth status
xurl whoami
```

Then create/schedule the X drafts and capture external draft/post IDs.

### D. Blog/CMS checklist

Pick one canonical CMS before scheduling asset 05.

WordPress requirements:
```bash
python3 - <<'PY'
import os
for k in ['WORDPRESS_URL','WORDPRESS_USERNAME','WORDPRESS_APP_PASSWORD']:
    print(f'{k}=' + ('SET' if os.getenv(k) else 'MISSING'))
PY
```

Webflow requirements:
```bash
python3 - <<'PY'
import os
for k in ['WEBFLOW_API_TOKEN','WEBFLOW_SITE_ID','WEBFLOW_COLLECTION_ID']:
    print(f'{k}=' + ('SET' if os.getenv(k) else 'MISSING'))
PY
```

Ghost requirements:
```bash
python3 - <<'PY'
import os
for k in ['GHOST_ADMIN_API_KEY','GHOST_API_URL']:
    print(f'{k}=' + ('SET' if os.getenv(k) else 'MISSING'))
PY
```

Required CMS fields for asset 05:
- CMS provider selected.
- Title confirmed.
- Slug confirmed.
- Excerpt/meta description if CMS requires it.
- Draft body formatted for CMS.
- Source links verified.
- CMS draft ID captured in 12-scheduling-confirmation.md.

### E. Re-run sequence after fixes

1. Update 11 with `APPROVED_FOR_PUBLISH` only for explicitly approved public assets.
2. Run scheduling step again so 12 contains:
   - channel
   - scheduled timestamp
   - external scheduler/CMS draft ID
   - final caption/title used
3. Run publish confirmation again so 13 contains:
   - `PUBLISHED`, `FAILED`, or `RESCHEDULED`
   - live URL/post ID
   - failure reason if failed
   - retry action
4. Run 24h outcomes only after at least one asset has a live URL/post ID and a 24h measurement window.

## Bottom line

The real blocker is not a channel API failure. The process stopped at authorization because every asset in step 11 is `HOLD`. Scheduling, channel connection, and publish API calls were correctly not attempted.
