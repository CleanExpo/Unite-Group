# Fleet router (UNI-3147)

Routes probe requests to `mac-mini`, `macbook-pro` or `windows-pc` by repo availability, through the
existing fleet broker. Plain Node, standard library only. It calls no model and no paid API, and it
talks only to the broker on this machine (`FLEET_BROKER`, default `http://127.0.0.1:42137`; anything
other than a loopback address is refused).

Probe-only: the broker receives exactly `{type, machineId}`.

## Using it

```bash
node submit.mjs --machine mac-mini --note "why this probe"   # pinned
node submit.mjs --repo unite-group                           # any machine that has the repo
node router.mjs --check                                      # exit 1 when the heartbeat is stale or missing
```

## Folders under `FLEET_ROUTER_HOME` (default `~/.unite-fleet/router`)

| Folder | Meaning |
|---|---|
| `inbox/` | Waiting requests. No eligible machine means it stays here and is retried each poll. |
| `claimed/` | Being sent right now. |
| `routed/<file>` | Sent: `{request, machineId, jobId, at}`. |
| `rejected/<file>` | Bad request, with the reason in `<file>.error.json`. |
| `heartbeat.json` | `{lastLoopAt, pid}`, written only after a healthy pass. |
| `rotation.json` | Who was routed to last, so rotation survives a restart. |

A claim left behind by a crash has an unknown outcome. The next start moves it to `rejected/` with
`interrupted_outcome_unknown` rather than risk sending it twice; submit it again if it still matters.

## Settings

`FLEET_ROUTER_POLL_MS` (5000), `FLEET_ROUTER_DEADMAN_MS` (90000), `FLEET_BROKER`, `FLEET_ROUTER_HOME`.

After `FLEET_ROUTER_DEADMAN_MS` with no healthy pass the process exits non-zero and launchd restarts it.

## launchd

`render-plist.mjs --out <file>` fills the template, runs `plutil -lint` and creates the log folder. It
never loads anything. The rendered file names the router folder it was rendered from, so that folder
has to outlive the agent: render from a permanent checkout, not a temporary worktree.

## Tests

`node --test` in this folder.
