# Linear Authentication Evidence

Last verified: 2026-06-02T02:03:31.131Z

## Credential bridge

- Canonical source: `D:/Unite-Group/Nexus-Hub/secrets/local.env`
- Project bridge: `D:\Unite-Hub\.linear-api-key`
- Bridge action: already matched canonical source
- Secret fingerprint: sha256:73c2fac8961c (first 12 hex chars only; secret not printed)

## Linear viewer verification

- GraphQL endpoint: `https://api.linear.app/graphql`
- Query: `viewer { id name email } organization { id name urlKey }`
- Result: HTTP 200, viewer `Phill McGurk` (ph***@gmail.com), organization `Unite-Group` / `unite-group`

## Operating rule

Use `D:/Unite-Group/Nexus-Hub/secrets/local.env` as the source of truth for `LINEAR_API_KEY`. Regenerate `.linear-api-key` with `npm run linear` whenever repo scripts need the project-local bridge. Do not print the key in terminal output or documentation.
