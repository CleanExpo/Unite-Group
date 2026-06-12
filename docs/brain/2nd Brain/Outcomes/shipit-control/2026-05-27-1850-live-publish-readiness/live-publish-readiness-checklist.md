# First live publish readiness checklist — UGN-004 / UGN-007

Generated: 2026-05-27T18:46:44+10:00
Operator bounds: LinkedIn/X/CMS may proceed only through existing ecosystem credentials/accounts. No new vendors, no new account signups, no Nango.

## Result
NEED_APPROVAL

## Credential discovery performed
- Checked current process/default Hermes env key names only; no secret values printed.
- Checked default/profile `.env` files for matching key names only; no secret values printed.
- Checked xurl prerequisite/auth status using `xurl auth status`; no `~/.xurl` file read.
- Checked 1Password metadata availability and item-title matches only; no item fields/secrets read.

## DONE
- UGN-004 internal draft packet already exists and remains ready for review: /Users/phillmcgurk/2nd-brain/Outcomes/shipit-control/2026-05-27-1835-draft-only-continuation/UGN-004-restoreassist-linkedin-blog-draft-only.md
- UGN-007 internal preflight artifact already exists and remains ready for review: /Users/phillmcgurk/2nd-brain/Outcomes/shipit-control/2026-05-27-1835-draft-only-continuation/UGN-007-publish-adapters-draft-only-preflight.md
- Existing-account policy check completed.

## BLOCKED
- None for local/internal artifact generation.

## NEED_APPROVAL / missing credentials before first live publish

### LinkedIn
Status: NEED_APPROVAL
Missing exact credential keys/targets:
- LINKEDIN_ACCESS_TOKEN
- one of LINKEDIN_ORGANIZATION_ID / LINKEDIN_PERSON_URN / LINKEDIN_AUTHOR_URN
Fallback:
- Keep UGN-004 as local draft-only packet; do not connect/authenticate/schedule/publish to LinkedIn.

### X/Twitter
Status: NEED_APPROVAL
Missing exact credential/config handles:
- ~/.xurl registered app with default OAuth user (`xurl auth status` reports: No apps registered)
- or existing env set: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET / X_BEARER_TOKEN
Fallback:
- Keep X/Twitter adapter readiness as local matrix only; do not register app, authenticate, schedule, or publish.

### CMS/blog
Status: NEED_APPROVAL
Missing exact credential keys/targets:
- CMS_BASE_URL
- CMS_API_TOKEN
- CMS_SITE_ID
- CMS_COLLECTION_ID or CMS_BLOG_ID
- or a complete existing CMS stack, e.g. WEBFLOW_API_TOKEN + WEBFLOW_SITE_ID + WEBFLOW_COLLECTION_ID, WORDPRESS_URL + WORDPRESS_USERNAME + WORDPRESS_APP_PASSWORD, GHOST_API_URL + GHOST_ADMIN_API_KEY, or SANITY_PROJECT_ID + SANITY_DATASET + SANITY_TOKEN
Fallback:
- Keep blog as local Markdown draft only; do not create CMS draft, authenticate, schedule, or publish.

## Readiness checklist for first live publish

1. Approval and scope
   - Phill explicitly approves the exact channel(s): LinkedIn, X/Twitter, and/or CMS.
   - Approval names whether the action is credential verification, draft creation, scheduling, or public publish.
   - Source asset status is APPROVED_FOR_PUBLISH, not merely draft-only or APPROVE_TO_QUEUE.

2. Existing-account credential gate
   - Credentials already exist in ecosystem storage; no new account/app/vendor/signup is needed.
   - LinkedIn: LINKEDIN_ACCESS_TOKEN plus target author/org/person URN present.
   - X/Twitter: xurl has registered default app + OAuth user, or approved existing env/API credentials are present.
   - CMS: canonical CMS target and required API/site/collection/blog identifiers are present.

3. Non-secret read-only verification gate
   - Verify account identity/target without printing secrets.
   - Verify required scopes/profile/site/collection are visible.
   - Record only account/profile/site names or IDs needed for audit; never record tokens.

4. Content review gate
   - Final text approved for channel-specific copy.
   - Claims checked against citation map.
   - No guarantees: no insurance acceptance, compliance certification, remediation outcome, or cyber-risk elimination claims.

5. Publish packet gate
   - Packet includes source artifact path, channel target, final copy, citation map, approval timestamp, rollback/removal plan, and audit evidence path.

6. Dry-run / draft gate where available
   - Create only a private/internal/draft object if the platform supports it and Phill approves that exact mutation.
   - If no true draft mode exists, stop before public publish unless explicit public publish approval is present.

7. Final live publish gate
   - Reconfirm channel, target account/site, copy, media, schedule time, and rollback/removal command.
   - Publish/schedule only after all prior gates pass.
   - Capture public URL or scheduler/CMS ID after success.

## Policy compliance summary
- Nango opened/used: no.
- New vendor/account/signup/app creation: no.
- Secret values printed: no.
- External live publish/schedule/CMS draft created: no.
- External auth attempted: no, except safe `xurl auth status` metadata check.
