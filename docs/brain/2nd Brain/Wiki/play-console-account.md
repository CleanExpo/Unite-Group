---
type: wiki
updated: 2026-05-15
---

# Google Play Console — RestoreAssist Developer Account

Restricted-account recovery + DUNS unblock plan + Android Developer Verification deadlock pattern. Sourced from Margot deep research 2026-05-15 (37 citations) + Gmail trail + Play Console UI walkthrough.

## Account identifiers

| Field | Value |
|---|---|
| Account | airestoreassist@gmail.com |
| Account ID | `8950300821619026235` |
| Recovery email | phill.mcgurk@gmail.com (security alerts only — support replies do NOT forward) |
| $25 fee paid | 2026-04-07 |
| Restricted status since | 2026-04-08 (37+ days as of 2026-05-15) |
| Original ticket | 2026-04-13, "Resolved by AI assistant" |
| AAB build | `~/Documents/RestoreAssist-keystore-backup/app-release.aab` (6.3 MB) |
| Owner entity | **Unite-Group Nexus Pty Ltd**, DUNS `775125643`, ACN 691477844, ABN 95691477844 |

## The deadlock pattern (documented systemic bug)

Google's Android Developer Verification flow has a documented circular dependency:

> **"To verify this phone number, complete other verification tasks first."**  
> **"To re-upload identity documents, complete phone verification first."**

The Play Console pulls identity from `pay.google.com` Payments Center, not the Console itself. If Payments Profile legal name doesn't match the identity document **character-for-character** (OCR is strict — "Rd" vs "Road", case-sensitive), identity check fails silently → phone edit UI locks → no recovery path through standard UI.

Further: 3 failed SMS attempts trip a 72-hour invisible rate-limit ("Too Many Requests" backstop). Reddit r/androiddev documents 23-day lockouts from repeated retry attempts.

## The unblock plan (4 steps, ~96h end-to-end)

### Step 1 — Sync Payments Profile FIRST (~10 min, do today)

At `https://pay.google.com` signed in as `airestoreassist@gmail.com`:
- Legal name matches Australian passport **exactly** (case + punctuation)
- Address matches passport (NO PO Box — Google rejects PO Boxes for KYC)
- Country = Australia (if currently US: create new payments profile; cannot edit country)
- Save + wait 5 min for propagation

This is the **highest-leverage step** — identity auto-rejections are almost always Payments Profile mismatch.

### Step 2 — Update base Google Account 2FA + wait 72h

At `https://myaccount.google.com/security`:
- Remove defunct US phone, add AU mobile `+61 457 123 005`
- Confirm via SMS to AU number (current 2FA works because backup codes / recovery email)
- **Hard 72-hour security hold** — non-negotiable Google policy
- Do NOT retry phone verification in Play Console during the wait — each attempt extends the invisible rate-limit

### Step 3 — Incognito sign-in to Play Console (after 72h)

- Quit Chrome entirely + reopen
- Open **Incognito** window
- Sign in directly to `https://play.google.com/console` as `airestoreassist@gmail.com`
- Developer account → About you → Contact details → Verify phone number
- Input `+61457123005` (international format, no spaces) → SMS → enter 6-digit code

### Step 4 — Community Forum escalation (in parallel with Step 2 wait)

Google Play Developer Community Forum (`https://support.google.com/googleplay/android-developer/community`) is the most effective escalation channel. Volunteer Product Experts (BenMcc, Avishkar Singh per 2025-2026 forum activity) can escalate threads directly to Google engineers. Post a clinical title — **no emotional language** — citing the catch-22 errors verbatim + the Developer ID. Margot research confirms this channel beats Tier 1 support ticket queue for verification loops.

## Pitfalls Margot research surfaced

- **Support agents are FORBIDDEN from clicking external links** (anti-phishing policy). When sending identity docs by email, **attach files directly** to the email AND provide the secure cloud link; not just the link.
- **Use Australian PASSPORT, not driver's licence** — passport processes 3-5× faster through Google's OCR.
- **Photo specs:** full colour, flat even lighting, no glare, all 4 corners visible, no filters, no crops.
- **Account migration from a restricted account is PROHIBITED.** Cannot transfer the app to a new clean account — you'd forfeit the package name (`com.restoreassist.app`) and orphan every existing install.
- **Email replies to `no-reply-googleplay-developer@google.com` go to a black hole.** All real replies route through Play Console internal messaging + email to the registered account holder (`airestoreassist@gmail.com`, NOT the recovery `phill.mcgurk@gmail.com`).

## Two DUNS on file (entity confusion avoidance)

| Entity | DUNS | Source |
|---|---|---|
| **Unite-Group Nexus Pty Ltd** | `775125643` | Phill's 2026-04-08 self-note (this is the Play Console owner) |
| Disaster Recovery Pty Ltd | (from D&B case 10265299 resolved 2026-04-20) | Separate D&B inquiry, NOT for this Play account |

Also note: AAB keystore CN string is "Unite Group Pty Ltd" (Brisbane, QLD) — **different legal entity** from Unite-Group Nexus (note hyphen + suffix differences). Doesn't block dev-account verification — CN is purely the signing-cert subject.

## Operational doc

Full appeal text + click paths + escalation templates at `~/google-play-appeal-2026-05-15.md` (outside repo, so PII like the AU mobile doesn't enter git history).

## Cross-refs

[[restore-assist]] · [[operational-priorities-q2-2026]] · [[founder]]
