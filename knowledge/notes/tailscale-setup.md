---
source: user
ingested: 2026-06-12
evidence: unconfirmed
topic: Tailscale setup — reference for the Fable System and local-first plans
---

# Tailscale Setup (reference note)

Status: **skeleton awaiting real details.** Phill's Tailscale credentials and
configuration live in 1Password; no 1Password connector was available in the
session that created this note, so everything below the "What we know" section
is a placeholder to fill in. **Never put auth keys or API tokens in this file**
— secrets belong in 1Password, Vercel env vars, or GitHub Actions secrets.

## What we know `[VERIFIED — vault notes]`

- Tailscale appears in the vault only in the **Paperclip evaluation / Mac Mini
  self-host** context: `2nd Brain/Wiki/paperclip-integration-2026-05-14.md`
  notes "Tailscale + secrets in deployment … aligns with our 'local-first,
  Mac Mini continuous loop' thesis" and an open question on "Tailscale
  integration depth — built-in or DIY?".
- The Fable System app itself runs on Vercel and does **not** use Tailscale.

## Details to fill in `[UNCONFIRMED — placeholders]`

| Field | Value |
|---|---|
| Tailnet name | _e.g. `xxxx.ts.net` — in 1Password_ |
| Admin account | _email used for the Tailscale admin console_ |
| Machines on the tailnet | _Mac Mini? laptop? names + roles_ |
| Auth key location | _1Password item name (key itself stays there)_ |
| MagicDNS / Funnel / Serve usage | _enabled? for what?_ |

## How this gets used later

- If the **Mac Mini self-host** path is taken (Paperclip thesis), the app or
  worker loop binds to the tailnet and this note holds the connection map.
- Once a **1Password connector** is added to Claude's environment, a session
  can read the item names (not the secrets into code) and complete this note.
