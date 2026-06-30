# Nexus persistent host (Docker-local + Tailscale)

Board mandate **P3** (2026-06-30). Makes the Nexus operator console durable and
unlocks true per-account lane isolation. **$0** — Docker-local now; the same
images lift to a VPS/cloud later without change (containerised for laptop → cloud
→ fleet).

## What runs

| Service | Source | Role | Restart |
|---|---|---|---|
| `workspace` | `apps/workspace` | operator console (`/command-center`, :3000) | `unless-stopped` |
| `presence` | `apps/autopilot-runner` | beats live gateway state → Supabase (web-CC bridge) | `unless-stopped` |
| gateway *(host)* | `~/.hermes/hermes-agent` (python venv) | plan-backed `/v1/*` on :8642 | host service |

The gateway stays on the host (reached via `host.docker.internal:8642`) — it is a
python venv, not vendored here. Run it durably with its existing service
(`launchctl`/systemd) alongside this compose.

## Run

```bash
cp deploy/nexus-host/.env.example deploy/nexus-host/.env   # founder fills secrets
docker compose -f deploy/nexus-host/docker-compose.yml config   # validate (done in CI of this PR)
docker compose -f deploy/nexus-host/docker-compose.yml up -d --build
```

Expose over the tailnet (never public): run `tailscaled` on the host; the web CC
reaches the operator over Tailscale. No port is published beyond loopback.

## Why this is the keystone

One artifact resolves three open items at once:
1. **Operator durability** — `restart: unless-stopped` ⇒ survives reboots.
2. **Stage-3 autonomy runner** — the same persistent host is the off-Vercel runner.
3. **True 3-plan lanes** — on **Linux**, `claude` writes credentials into
   `CLAUDE_CONFIG_DIR` (the bind-mounted `~/.hermes/accounts/<acct>`), so
   `provision-lanes.sh` gives three *dedicated* logins — impossible on macOS,
   where creds go to the Keychain (memory `macos-claude-cli-keychain-lanes`).

## Status / DoD

- ✅ Orchestration authored; `docker compose config` validates (this PR).
- ⏳ **Demonstration pending a Linux host** — reboot-survival and the 3 dedicated
  lane logins (P3 DoD) require running on Linux; this Mac cannot demonstrate the
  Keychain-free isolation. Build pass on the host may need package.json-graph
  tweaks in the Dockerfiles (flagged inline).
- 🔒 Founder secrets (`HERMES_PASSWORD`, Supabase service key) entered in `.env`.
