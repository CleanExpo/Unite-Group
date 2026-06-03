# Live Integration Runbook

> Date: 03/06/2026
> Scope: Unite-Hub live CRM and bookkeeping activation

## Current Position

Unite-Hub is using the existing Xero **ATO App** as the shared OAuth app for the current multi-business setup. Do not create more Xero apps unless the operating model changes and each business needs separate ownership, billing, or security governance.

Production app:

```text
https://unite-hub-sandbox.vercel.app
```

Xero callback URI:

```text
https://unite-hub-sandbox.vercel.app/api/xero/callback
```

Xero webhook URI:

```text
https://unite-hub-sandbox.vercel.app/api/webhooks/xero
```

## Completed

- ATO App callback URI is configured for Unite-Hub production.
- `XERO_CLIENT_ID` is configured in Vercel Production.
- `XERO_CLIENT_SECRET` is configured in Vercel Production.
- `XERO_WEBHOOK_KEY` is configured in Vercel Production.
- `XERO_TENANT_ID_CARSI`, `XERO_TENANT_ID_DR`, and `XERO_TENANT_ID_DRQLD` are configured in Vercel Production.
- Xero webhook endpoint accepts signed payloads and rejects unsigned payloads.
- Production build and deploy completed after Xero secret update.
- Live Xero UI shows Disaster Recovery connected.
- Live Xero UI shows CARSI connected.

## Remaining Xero Work

1. Complete Unite-Hub MFA for the NRPG / Disaster Recovery Qld connection.
2. Complete the Xero OAuth consent flow for `business=nrpg`.
3. Verify the live Xero page shows NRPG as connected.
4. Run a read-only bookkeeping dry run before any full sync.

## Recommended Operating Sequence

1. **Authentication**
   Complete the Unite-Hub MFA prompt with the Nexus / Unite-Hub authenticator code.

2. **Connection**
   Connect NRPG / Disaster Recovery Qld through the existing ATO App OAuth flow.

3. **Read-only verification**
   Pull Xero counts and exception summaries without writing to Xero and without committing reconciliation decisions.

4. **Internal sync**
   Import bookkeeping records into Unite-Hub after the read-only result looks sane.

5. **Human review**
   Review unmatched, suggested, and manual-review transactions before approving any changes.

6. **External writes**
   Only use Xero write actions after the mappings are verified. Approve/reconcile endpoints should remain founder-session protected.

## Guardrails

- Keep DB queries scoped by `founder_id`.
- Do not use `workspace_id`.
- Do not print secrets in chat, logs, docs, or screenshots.
- Do not create extra Xero apps while the shared-login cost-saving model is active.
- Do not run the full bookkeeper trigger as a substitute for a dry run.

## Open Items

- NRPG MFA/OAuth completion is still waiting for the live MFA code.
- Gmail and calendar OAuth should be connected after the Xero connections are stable.
- Social publishing credentials can wait until bookkeeping and email ingestion are working.
