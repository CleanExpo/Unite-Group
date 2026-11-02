# Mission Control Local

A wall display for the Mac Mini: two full-screen Chrome windows showing a widget grid. It binds `127.0.0.1` only, and it reads the fleet broker without ever writing to it.

## Run it

```bash
mkdir -p ~/.unite-mission-control
chmod 700 ~/.unite-mission-control
# Put a passcode of 8 or more characters in ~/.unite-mission-control/passcode, then:
chmod 600 ~/.unite-mission-control/passcode
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:42140/screen/1` and `http://127.0.0.1:42140/screen/2`. The server refuses to start without a passcode. This PR adds no launchd job, so starting it at login is a later step.

When the passcode comes from the file, the server checks before it starts and refuses with a plain error if any check fails:

- The data folder and the passcode file must be real, not symlinks.
- Both must belong to the user running the server.
- The folder must be mode exactly `700`, and the file must give no access to group or other (`600` or `400`). Another user who could write the folder could swap the passcode.

Windows has no POSIX modes, so there only the symlink rule applies. Keep the folder private to your account. `MC_PASSCODE` skips the file checks.

## Layouts

Each save or reset writes a new file, `layouts/screen-<n>.r<revision>.json`. The highest revision is the current layout, and the last 10 are kept. A save names the revision the window last loaded (`If-Match` header, or a `revision` field). If another window saved first, the server changes nothing and answers 409 with its layout. The window then asks: reload the other layout, or overwrite it with yours. A save is never dropped without that choice. If the session has ended, the window stays on the page and holds the change: sign in again in another window and press Retry, or sign in here and drop it. A file that cannot be read is never overwritten, and it is renamed aside rather than deleted.

## Settings

| Variable | What it does |
|---|---|
| `MC_PASSCODE` | Passcode, used instead of the file |
| `MC_PORT` | Port, default 42140 |
| `MC_DATA_DIR` | Folder for `passcode` and the `layouts/` folder (see Layouts), default `~/.unite-mission-control` |
| `MC_FIXTURE` | Path to a fixture such as `fixtures/status.json`. The toolbar then shows FIXTURE DATA |
| `MC_SHOW_TAILSCALE_IP` | Set to `1` to show each machine's Tailscale IP. Hidden otherwise |

The bind address has no setting.

## Fleet data

`server/broker.ts` is the only code that talks to the broker, and it sends one request: `GET http://127.0.0.1:42137/status`. `server/fleet.ts` copies named fields into the view in `shared/types.ts`, so hostnames, paths, refs and job results stay on the server, and anything new the broker adds stays out until someone adds it. Words the broker supplies (state, job status and type, repo, capability) must be on the fixed lists in `server/fleet.ts`. A new word shows as "unknown", or is left off, until someone adds it there. `server/redact.ts` then scrubs the result as a second layer.

A machine shows stale after 45 seconds without a heartbeat, matching the broker's own freshness window, and offline after 5 minutes. A failed broker read shows "Broker down" on every fleet widget, never an empty list.

## Add a widget

1. Add a row to `WIDGET_CATALOGUE` in `shared/widget-catalogue.ts`.
2. Add its component to `src/registry.tsx`. The type-check fails until you do.

A new data source gets its own server route behind the session gate, so no credential reaches the browser.

## Checks

```bash
npm run type-check
npm test
npm run build
```
