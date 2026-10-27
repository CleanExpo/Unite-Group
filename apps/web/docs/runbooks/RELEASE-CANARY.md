# Release canary

This file exists to TEST one claim about the release path: **merging to `main` does not move
the production domain.** Until a merge has been observed, the claim is unproven.

The claim rests on one setting. On 27/09/2026 the Vercel project `unite-group` was set to
`autoAssignCustomDomains=false`. A merge to `main` still creates a deployment with
`target=production`; the setting only stops Vercel from moving the custom domain
(`unite-group.in`) onto it. The domain moves only when someone promotes that deployment.

The file is under `apps/web/` so a merge that adds or edits it runs the normal Vercel build
(`scripts/lib/web-build-inputs.mjs`). It is Markdown, so nothing in the app reads it, and it
has no effect on runtime, auth, data or security behaviour.

## How to run the test

Before merging, record the deployment that `unite-group.in` currently points at (its id and
commit SHA). Then merge a PR that edits the date below, through the release gate, and check:

1. a Vercel deployment exists for the merge commit's SHA;
2. `unite-group.in` does NOT point at that new deployment;
3. `unite-group.in` still points at the deployment recorded before the merge;
4. `https://unite-group.in/api/health` still returns 200.

If the domain moved to the new deployment, that is `RELEASE_BOUNDARY_FAILURE`: stop automatic
merges and restore the recorded deployment with `vercel promote`.

Last canary edit: 27/09/2026 (UNI-2779).
