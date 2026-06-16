# UNI-1947 — Silent-fail button audit (Unite-Group CRM frontend)

**Date:** 2026-05-18
**Scope:** Every `onClick` handler under `src/app/empire/`, `src/app/[locale]/empire/`, `src/components/empire/`, and `src/components/command-center/`. 19 click surfaces examined.

**Definition** (per UNI-1947 brief): a click surface is _silent-fail_ when its handler can fire-and-forget without giving the operator a watchable progress + outcome signal. The audit looks for handlers that:
- swallow exceptions into empty state,
- have no `loading` flag wired to the button,
- have no `error` / `success` notice surfaced to the operator.

## Findings

| Surface | File | Status | Notes |
|---|---|---|---|
| Trigger Pi-CEO Scan | `[slug]/page.tsx:695` | ✅ OK | `triggerScan` sets `status` + `errorMsg`, surfaces inline |
| Inline rescan CTA | `[slug]/page.tsx:527` | ✅ OK | Delegates to `triggerScan` |
| **Refresh registry** | `onboard-client/page.tsx:247` | ❌ **SILENT-FAIL** | Errors swallowed into `setBots([])`. Operator can't tell empty-registry from API-failure |
| Action buttons | `[slug]/page.tsx:601` | ✅ OK | Pure presentational handler |
| SourceMatrixGrid open | `SourceMatrixGrid.tsx:107` | ✅ OK | Navigation only |
| SourceMatrixGrid close (modal) | `SourceMatrixGrid.tsx:200/246` | ✅ OK | Pure state toggle |
| SourceMatrixGrid stopProp | `SourceMatrixGrid.tsx:203` | ✅ OK | Event-control only |
| SourceMatrixGrid refresh | `SourceMatrixGrid.tsx:507` | ✅ OK | `load(true)` — sets loading + error |
| SourceMatrixGrid drawer | `SourceMatrixGrid.tsx:655` | ✅ OK | Pure state |
| SystemHealthTile open | `SystemHealthTile.tsx:83` | ✅ OK | Modal toggle |
| SystemHealthTile stopProp | `SystemHealthTile.tsx:111` | ✅ OK | Event-control |
| SystemHealthTile refresh | `SystemHealthTile.tsx:273` | ✅ OK | `load(true)` — sets loading + error |
| SystemHealthTile expand | `SystemHealthTile.tsx:329` | ✅ OK | Pure state toggle |
| DataRoom Regenerate all | `DataRoomConsole.tsx:138` | ✅ OK | `regenerateAll` sets `regenerating` + `notice` (shipped #111) |
| DataRoom Approve | `DataRoomConsole.tsx:258` | ✅ OK | `setAuditStatus` sets `pendingId` + `notice` (shipped #109) |
| DataRoom Reject | `DataRoomConsole.tsx:263` | ✅ OK | same |
| DataRoom Supersede | `DataRoomConsole.tsx:268` | ✅ OK | same |
| DataRoom row open | `DataRoomConsole.tsx:336` | ✅ OK | Navigation only |
| Margot Start voice | `MargotVoicePanel.tsx:92` | ✅ OK | `prepareSession` sets `state` + structured `failure` (shipped #97) |
| Hermes Request approval | `HermesControlPanel.tsx:393` | ✅ OK | `setAuditStatus → outcome` strict (shipped #98) |

## Remediation

The one offender — `loadBots` Refresh in `/[locale]/empire/onboard-client/page.tsx` — is fixed in the same PR as this audit doc:

- Adds `botsLoading` + `botsError` state.
- Button disables + shows "Refreshing…" while in-flight.
- Inline alert surfaces the error message; the "No bots in registry yet" fallback copy distinguishes the three states (loading / error / genuinely empty).

## Why the surface looked so much cleaner than the RA-1155 brief expected

The Command Center audit work shipped earlier today (PRs #96–#119) introduced **structured action contracts** as the project's default pattern:
- `failure-taxonomy.ts` for Margot voice (#97)
- `add-on-result.ts` for the Hermes control panel (#98)
- `SourceBadge` + `DegradedDataBanner` (#100)
- Per-kind freshness + regen-notice pattern in the DataRoom admin (#109/#111/#114)

The same patterns leaked into the rest of the CRM via PR review, so by the time this audit ran, only one fire-and-forget remained.

## Recommendation for keeping the surface clean

Add a lint rule (`eslint-plugin-custom`) or a CI grep that flags `onClick={...async...}` handlers in `src/app/[locale]/empire/` and `src/components/empire/` whose function body contains a bare `catch {}` or `catch (_) {}`. A follow-up ticket can wire this in once the silent-fail class of bug is closed.
