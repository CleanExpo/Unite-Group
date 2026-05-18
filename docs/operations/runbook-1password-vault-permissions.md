# Runbook — 1Password vault permissions for the Unite-Group sync

> **Last verified:** 2026-05-18. **Current state:** 1 of 7 vaults visible to the service account.

## What's broken

The Hermes daily 04:00 AEST cron job `Unite-Group 1Password sync` runs
`/Users/phill-mac/Pi-CEO/scripts/sync_1password_to_supabase.py`. Its preflight
calls `op vault list` as the 1Password service account, then refuses to run
the stale-row sweep when fewer vaults are visible than expected
(`OP_ALLOW_PARTIAL_VAULT_SYNC` default is off — this prevents the sweep from
deleting rows that belong to a temporarily-inaccessible vault).

Today the script reaches Supabase with rows for only 1 of 7 configured vaults:

| Vault | Items | Last fetched | Status |
|---|---|---|---|
| Unite-Group-Infrastructure | 83 | 2026-05-17 13:04 UTC | ok |
| RestoreAssist | 0 | — | MISSING — grant access |
| Carsi | 0 | — | MISSING — grant access |
| CCW-CRM | 0 | — | MISSING — grant access |
| Synthex | 0 | — | MISSING — grant access |
| Email-Accounts | 0 | — | MISSING — grant access |
| Personal | 0 | — | MISSING — grant access |

Because of the partial-coverage guard, the script also exits non-zero each
run, which Hermes routes to Telegram. So this is also why you're getting a
daily "1Password sync failed" message at 04:00 AEST.

## Why fix it

Without the missing vaults indexed in Supabase, the Unite-Group control
panel's "Where is X stored?" lookups (planned for the Pilot V1 cutover Tue
2026-05-19 18:00 AEST) cannot answer for items in `RestoreAssist`, `Carsi`,
`CCW-CRM`, `Synthex`, `Email-Accounts`, or `Personal`. Also: each failed
daily sync emits a Telegram alert that has lost its signal (you've seen 5+
in a row), which dilutes the alert channel.

## The fix (15 min, one-time)

The service account doesn't have **read** permission on the 6 missing
vaults. Grant it in the 1Password web UI.

### Steps

1. **Open the service-account settings.**
   - https://my.1password.com → upper-right account menu → **Developer** → **Service Accounts**
   - Pick the service account whose token is in `~/.hermes/.env` as
     `OP_SERVICE_ACCOUNT_TOKEN` (or
     `~/.hermes/.op-service-account-token`). Name is likely something like
     `unite-group-hermes-sync`.

2. **For each of the 6 missing vaults**, add read-only access:
   - On the service-account page, find the **Vaults** section.
   - Click **Add Vault** (or **Grant access**).
   - Select the vault by name.
   - Set permission to **Read items** (NOT read item values — the sync only
     needs item NAMES + metadata, never values).
   - Save.

   Repeat for: `RestoreAssist`, `Carsi`, `CCW-CRM`, `Synthex`,
   `Email-Accounts`, `Personal`.

3. **Verify visibility from the Mac mini** (where Hermes runs):
   ```bash
   eval $(op signin)
   OP_SERVICE_ACCOUNT_TOKEN=$(cat ~/.hermes/.op-service-account-token) \
     op vault list --format json | jq -r '.[].name' | sort
   ```
   Expected: all 7 vault names listed.

4. **Trigger a manual sync** (don't wait until 04:00 the next day):
   ```bash
   cd ~/pi-seo-workspace/unite-group
   ./scripts/unite onepassword-sync
   ```
   Expected: `[SILENT]` on stdout, non-zero return only on a genuine error.

5. **Confirm Supabase received the rows** from this repo:
   ```bash
   ./scripts/unite vault-status
   ```
   (Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` — `vercel env pull
   .env.local --environment=production` to refresh.) Expected output:

   ```
   VAULT                              ITEMS  LAST FETCHED         STATUS
   ──────────────────────────────────────────────────────────────────────
   Unite-Group-Infrastructure            83  2026-…               ok
   RestoreAssist                         <N> 2026-…               ok
   …
   ✓ all 7 expected vaults present and fresh
   ```

## If you intentionally drop a vault

If `Personal` (or any other) is intentionally out of scope, the right
change is to **remove it from `DEFAULT_VAULTS`** in
`/Users/phill-mac/Pi-CEO/scripts/sync_1password_to_supabase.py` (a few-line
PR on that file). Or set `OP_VAULTS` in `~/.hermes/.env` to the
comma-separated list of vaults you *do* want indexed; `DEFAULT_VAULTS` is
the fallback.

Setting `OP_ALLOW_PARTIAL_VAULT_SYNC=1` in `~/.hermes/.env` is the wrong
answer — it lets the sync continue with partial coverage AND run the
stale-row sweep, which will delete rows for vaults that are
temporarily-inaccessible (e.g. 1Password down for maintenance). Only flip
that env if you understand and accept that data-loss risk.

## Related

- Hermes job entry: `~/.hermes/cron/jobs.json` → `Unite-Group 1Password sync` (daily 04:00 AEST)
- Canonical script: `/Users/phill-mac/Pi-CEO/scripts/sync_1password_to_supabase.py`
- Cron shim: `~/.hermes/scripts/sync_1password_to_supabase.py` (delegates to canonical)
- Supabase table: `integration_onepassword_index` (project `lksfwktwtmyznckodsau`)
- Cockpit map: `docs/SOURCES.md` § Hermes
- Live verification: `./scripts/unite vault-status`
