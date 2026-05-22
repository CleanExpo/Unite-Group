# Lead-to-Client Conversion Plan

Date: 2026-05-23
Owner: Margot
Status: Draft contract / no production conversion route implemented

## Non-negotiable rule

Lead qualification is recommendation-only. A score or band can prioritize review, but it must not create, overwrite, merge, or convert a client without passing the identity gates below and an explicit operator-approved conversion action.

## State machine

```text
captured
  -> qualified_recommendation
  -> identity_review
  -> conversion_ready
  -> converted

captured
  -> qualified_recommendation
  -> nurture

captured
  -> spam_risk
  -> closed_no_conversion

identity_review
  -> conflict_blocked
  -> closed_no_conversion

conversion_ready
  -> conversion_failed
  -> identity_review
```

## State definitions

| State | Meaning | Allowed writes |
| --- | --- | --- |
| `captured` | CRM lead exists from website/API intake. | Lead row only. |
| `qualified_recommendation` | Deterministic helper produced score, band, reasons, and operator notes. | Qualification metadata on lead or related activity. |
| `identity_review` | Margot/operator checks exact identifiers against existing clients/businesses/contacts. | Review task/activity; no client mutation. |
| `nurture` | Not urgent enough for conversion; keep attribution and optional marketing follow-up. | Lead status/activity only. |
| `spam_risk` | Potential spam or abuse. | Lead status/activity only; no external follow-up by default. |
| `conflict_blocked` | More than one plausible identity or mismatched strong identifiers. | Blocker/task only. |
| `conversion_ready` | Exact identity gate passed and operator approved conversion intent. | Pending conversion activity/task. |
| `converted` | Client/contact/opportunity write completed and lead references target IDs. | Client/contact/opportunity plus audit event. |
| `conversion_failed` | Attempted safe conversion failed. | Error activity/task; no partial silent success. |
| `closed_no_conversion` | Human or policy decided not to convert. | Lead status/activity only. |

## Identity gates before conversion

Conversion must fail closed unless all required gates pass:

1. Exact lead ID: request names one `crm_leads.id`; no bulk or fuzzy conversion.
2. Not already converted: `converted_client_id` must be empty before conversion starts.
3. Lead exists and is not deleted/archived in a way that forbids conversion.
4. Conflict check: no competing existing client/business/contact with mismatched strong identifiers.
5. Strong identity evidence: at least one exact strong key, or two corroborating non-secret keys, such as:
   - explicit operator-selected `nexus_clients.id` or `businesses.id`
   - verified contact email plus matching domain/company
   - Stripe customer/subscription ID
   - existing client slug/business slug
6. Operator approval: explicit action by Phill/Margot workflow; qualification score alone is insufficient.
7. Audit readiness: conversion must be able to write an activity/audit record, or return a safe failure before client mutation.

## Expected API contract seed

A future mock-first conversion endpoint should prefer safe failures:

- Missing exact lead ID -> `400` with `exact_lead_id_required`; no conversion.
- Lead not found -> `404` with `lead_not_found`; no conversion.
- Lead already converted -> `409` with `lead_already_converted`; no duplicate client.
- Identity conflict -> `409` with `identity_conflict`; no conversion.
- Missing operator approval -> `403` with `operator_approval_required`; no conversion.

## Implementation notes

- Keep conversion logic behind tests and mocks until schema/route ownership is confirmed.
- Do not apply migrations or write production data from this draft.
- Preserve original lead attribution; conversion should set status/target references, not delete lead history.
- Every conversion should produce a timeline/audit event suitable for daily digest and command center surfaces.
