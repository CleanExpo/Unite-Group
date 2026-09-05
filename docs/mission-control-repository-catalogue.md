# Mission Control repository catalogue

Mission preparation can retain any exact `owner/repository` selected from the connected GitHub catalogue, including private, archived, organisation and collaborator repositories outside the portfolio registry. A catalogue entry establishes visibility; it does not authorise a build, deployment or unarchiving.

## Runtime connection and coverage

The authenticated API uses the application's existing server-only `GITHUB_TOKEN` convention. It reads `GET /user/repos` with `visibility=all`, `affiliation=owner,collaborator,organization_member`, `sort=full_name`, ascending order and 100 entries per page. This follows the [GitHub authenticated-user repository API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user). GitHub App user tokens and personal access tokens are supported according to that endpoint's permissions. Installation-only credentials, token repository restrictions and organisation SSO restrictions may require operator attention. No account or portfolio allowlist limits this catalogue.

The token's identity and permissions determine runtime coverage. A local GitHub CLI or desktop connector can have different permissions; its visible list is not proof that the deployed application has the same access. Production repository reads returned HTTP 401 during the separate read-only observation on 05/09/2026. This implementation does not change credentials or resolve that runtime rejection.

## HTTP contract

`GET /api/command-centre/missions/repositories?cursor=2` requires the existing founder session. Omit the cursor for page 1. Only decimal cursors 1–10000 are accepted; duplicate or additional parameters return HTTP 400. Unauthenticated requests return HTTP 401 before GitHub is called. Provider results use HTTP 200 with an explicit status, so a GitHub auth error is distinct from a founder login error. Responses are private and uncached.

```ts
{
  repositories: Array<{ fullName: string; private: boolean; archived: boolean }>;
  status: 'complete' | 'partial' | 'not_connected' | 'auth_error' | 'rate_limited' | 'unavailable';
  message: string;
  nextCursor: string | null;
  incomplete: boolean;
  observedAt: string;
  coverage: string;
  retryAfterSeconds?: number;
}
```

Each request makes one bounded GitHub call, with a ten-second deadline covering response and JSON parsing. There are no automatic retries. Numeric pagination is generated locally; provider URLs are never followed. An exactly full page without pagination headers requests one further page. The maximum page boundary remains explicitly incomplete if more entries may exist.

Clients retain previously loaded repositories, deduplicate by the returned full owner/name and accumulate `incomplete` across pages. The backend additionally deduplicates each individual page case-insensitively. Normal pagination returns `partial`, `incomplete:false` and a next cursor. Malformed entries or operational failures set `incomplete:true`; a later successful page must not erase that gap. `complete` means this response is the final page, not that a client that skipped earlier pages has loaded them. Client search covers loaded entries only. Public/private and archived entries remain visible.

## Mission and execution boundary

Pass the exact `fullName` as `projectKey` in the existing prepare request. The server verifies it through [GitHub's repository endpoint](https://docs.github.com/en/rest/repos/repos#get-a-repository), rejects identity changes and preserves the full name in the task, draft specification, source reference and subsequent resume. Names are bounded to 140 characters for the full GitHub identity. Unregistered repositories use explicit unregistered context rather than inheriting another business's settings from a matching short name. Repository content is not read or treated as instructions.

An unavailable selection remains saved with an honest connection error. Resuming verifies that same selected repository rather than silently substituting a portfolio project. Existing named business inputs and the historical portfolio identity adapter remain supported.

Only the existing canonical repository runner remains admissible. The canonical full repository name retains its identity in the mission while resolving to the existing signed, founder-approved branch-build packet. Approval rereads its repository access, refuses archived targets and retains the existing portfolio target check, spec fingerprint, signature, durable consent and checkout-origin checks. Other accessible repositories can reach a reviewed specification but require their own authorised runner connection; catalogue visibility never expands execution scope.

Grounded 05/09/2026: source implementation and injected-provider tests in `delivery-repositories.ts`, `delivery-prepare.ts` and the repository API route. No live token mutation, schema migration, remote build or release was performed by this backend slice.
