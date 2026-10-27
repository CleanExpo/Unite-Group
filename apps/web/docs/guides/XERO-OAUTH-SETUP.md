# Xero OAuth — wiring guide (revenue · invoices · bank · contacts)

> The **code is ready and hardened** (`/api/xero/connect?business=<key>` → signed
> founder-bound state → `/api/xero/callback` → encrypted tokens in `credentials_vault`,
> CSRF-protected per #304, honest vault-save). What remains is **yours**: the Xero
> developer app(s) + credentials + per-business consent. I can't enter secrets or click
> consent. Until credentials are set, every revenue figure is `source: 'mock'` — and the
> dashboard surfaces it as mock, not real (No-Invaders).

---

## 1. Credential model — two Xero "groups"

The code routes each business to one of two client-credential pairs
(`src/lib/integrations/xero/client.ts`):

| Businesses | Env pair | Xero account |
|---|---|---|
| `dr`, `nrpg` | `DR_CLIENT_ID` / `DR_CLIENT_SECRET` | the **DR** Xero login |
| `carsi`, `restore`, `synthex`, `ccw` (+ any other) | `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` | the **CARSI** Xero login |

- If all these orgs live under **one** Xero login, you only need **one** app — set both
  env pairs to the same client id/secret (or just the `XERO_CLIENT_*` pair and move `dr`/`nrpg`
  there). `isXeroConfigured()` is true if **either** pair is set.
- `ato` isn't routed to Xero here; ignore unless you add it.

---

## 2. Create the Xero app(s) — developer.xero.com

For each credential group (1 or 2 apps):

1. **My Apps → New app** → type **Web app**.
2. **OAuth 2.0 redirect URI**: `https://<your-prod-domain>/api/xero/callback`
   (must equal `${NEXT_PUBLIC_APP_URL}/api/xero/callback`; add `http://localhost:3000/...` for dev).
3. After creating: generate a **client secret**, copy the **Client ID** + **secret**.
4. The app must allow these scopes (the connect route requests them):
   `openid profile email offline_access accounting.reports.profitandloss.read
   accounting.invoices.read accounting.banktransactions accounting.contacts.read
   accounting.settings.read`.

---

## 3. Environment variables (Vercel → apps/web project)

| Var | For |
|---|---|
| `DR_CLIENT_ID` / `DR_CLIENT_SECRET` | dr, nrpg |
| `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` | carsi, restore, synthex, ccw |
| `NEXT_PUBLIC_APP_URL` | prod URL (drives the redirect_uri — must match §2.2) |
| `XERO_TENANT_ID_DR`, `XERO_TENANT_ID_NRPG`, `XERO_TENANT_ID_CARSI` | *(optional)* pin which Xero **org** each business maps to, when one login has several orgs. Without these the first connected tenant is used. |

`VAULT_ENCRYPTION_KEY` must already be set (encrypts the stored tokens). Redeploy after
setting these.

---

## 4. Connect each business (you, in the browser)

Go to **`/founder/xero`** and connect each business, or hit directly:

```
https://<your-prod-domain>/api/xero/connect?business=<dr|nrpg|carsi|restore|synthex|ccw>
```

→ Xero consent (pick the matching organisation) → redirected back to
`/founder/xero?connected=true&business=<key>`. The token is encrypted into `credentials_vault`
(`service='xero'`, `label=<businessKey>`).

> **MFA note:** if you have TOTP enrolled, `/api/xero/connect` enforces AAL2 first
> (`error=mfa_required` otherwise) — complete the in-app MFA gate, then connect.

---

## 5. Verify it's live (real data, not mock)

- **Founder dashboard / revenue tiles** → figures now read `source: 'xero'` instead of the
  mock numbers; the "mock" affordance disappears.
- **/founder/invoices** → real Xero invoices for the connected business.
- A wrong/again-needed org shows an honest `error=tenant_mismatch` (set `XERO_TENANT_ID_*`).

If revenue stays mock after connecting: confirm the client id/secret pair for that business
group is set (not blank), the redirect URI matches exactly, and a `service='xero'`,
`label=<businessKey>` row exists in `credentials_vault`.

---

## Notes

- Per `src/lib/integrations/CLAUDE.md`: tokens were previously stored for `dr` + `carsi` only —
  those may connect immediately once secrets are set; the rest need a first consent.
- The callback derives founder identity from the **session** and validates a signed,
  founder-bound, time-limited state (CSRF-safe, #304); it redirects `error=vault_save` if the
  token can't be stored, so `connected=true` always means it really persisted.
