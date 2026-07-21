# Nexus persistent host (Docker-local + Tailscale)

Board mandate **P3** (2026-06-30). Makes the Nexus operator console durable with
the existing Docker-local stack. The container receives a gateway token and a
read-only knowledge mount; it does not receive browser profiles, plan-account
credentials, or a Supabase service-role key.

## What runs

| Service | Source | Role | Restart |
|---|---|---|---|
| `workspace` | `apps/workspace` | operator console (`/command-center`, :3000) | `unless-stopped` |
| gateway *(host)* | `~/.hermes/hermes-agent` (python venv) | `/v1/*` on :8642 | separately managed host service |

The gateway stays on the host (reached via `host.docker.internal:8642`) — it is a
python venv, not vendored here. Run it durably with its existing service
(`launchctl`/systemd) alongside this compose.

## Run

```bash
cp deploy/nexus-host/.env.example deploy/nexus-host/.env   # founder fills secrets
docker compose --env-file deploy/nexus-host/.env -f deploy/nexus-host/docker-compose.yml config
docker compose --env-file deploy/nexus-host/.env -f deploy/nexus-host/docker-compose.yml up -d --build
```

The explicit `--env-file` is required when these commands run from the
repository root. Compose fails closed when the gateway key, workspace password,
or vault path is missing; it never substitutes an empty credential or mount.

Expose over the tailnet (never public): run `tailscaled` on the host; the web CC
reaches the operator over Tailscale. No port is published beyond loopback.

## Why this is the keystone

This artifact provides one bounded capability: a reboot-surviving operator
workspace on loopback. Authentication remains in the separately managed Hermes
gateway. A single workspace container is not an account-isolation boundary.

The former `presence` container is retired. It held a long-lived Supabase
service-role credential in a continuously running process, which was not an
acceptable least-privilege boundary. Presence publication needs a dedicated
identity and independently verified write path before it can return.

## Status / DoD

- ✅ The workspace uses its canonical package build context and a digest-pinned
  Node image.
- ⏳ Reboot-survival still requires demonstration on the intended Linux host.
- 🔒 Only `API_SERVER_KEY`, `HERMES_PASSWORD`, and the read-only vault path are
  accepted by this Compose surface.
