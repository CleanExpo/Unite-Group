# Linear UNI-2055 Safe Tick — CCW EOFY Organic Campaign

Timestamp: 2026-05-28 09:14 AEST
Owner: Margot / Hermes
Linear: UNI-2055
Source mirror: `docs/margot/linear-watch-today.md`
Primary draft artifact: `docs/margot/ccw-eofy-organic-campaign-copy-pack.md`
Status: local draft/evidence only; not client-facing; not scheduled; not published.

## What was checked

The restored Linear mirror shows UNI-2055 as the top urgent candidate:

- Campaign: CCW EOFY organic campaign for Toby.
- Channel priority: Facebook first; LinkedIn/Instagram variants as useful.
- Required scope: 10 Facebook concepts/captions, 3 service-booking posts, 3 urgency posts, image/video brief per post, missing Toby inputs, compliance-safe wording, Synthex route for scheduling/approval.

Existing local artifact found:

- `docs/margot/ccw-eofy-organic-campaign-copy-pack.md`

## Acceptance check against UNI-2055

| Requirement | Evidence | Status |
| --- | --- | --- |
| 10 Facebook post concepts/captions | Sections `### 1` through `### 10` in copy pack | PASS |
| 3 service-booking posts | `Service post 1`, `Service post 2`, `Service post 3` | PASS |
| 3 urgency posts | `Urgency post 1`, `Urgency post 2`, `Urgency post 3` | PASS |
| Image/video brief per post | 16 `Image/video brief:` entries counted | PASS |
| Accountant-safe EOFY wording | Guardrails prohibit guaranteed tax credits/deductions and require accountant-safe phrasing | PASS |
| Missing Toby inputs listed | Stock priorities, workshop capacity, CTA, photos/video, exclusions | PASS |
| No paid ads / no posting without approval | Copy pack explicitly blocks paid promotion and scheduling/posting until approved | PASS |
| Synthex route noted | Copy pack says final approved copy routes through Synthex/scheduling | PASS, pending operator/client approval |

## Verification command/result

Command run locally:

```bash
python3 - <<'PY'
from pathlib import Path
text=Path('docs/margot/ccw-eofy-organic-campaign-copy-pack.md').read_text()
checks={
'10 Facebook post concepts': text.count('### ')>=16 and '### 10. Final June reminder' in text,
'3 service-booking posts': all(s in text for s in ['Service post 1','Service post 2','Service post 3']),
'3 urgency posts': all(s in text for s in ['Urgency post 1','Urgency post 2','Urgency post 3']),
'image/video brief per post': text.count('Image/video brief:')>=16,
'accountant-safe guardrails': 'Do not state or imply guaranteed tax credits' in text and 'speak with your accountant' in text,
'missing Toby inputs listed': 'Missing inputs to request from Toby' in text,
'no scheduling/publishing approved': 'No scheduling or posting is approved' in text,
}
for k,v in checks.items(): print(f'{k}: {v}')
print('image_brief_count=', text.count('Image/video brief:'))
PY
```

Result:

- 10 Facebook post concepts: True
- 3 service-booking posts: True
- 3 urgency posts: True
- image/video brief per post: True
- accountant-safe guardrails: True
- missing Toby inputs listed: True
- no scheduling/publishing approved: True
- image_brief_count=16

## Approval boundary

Safe to do without further approval:

- Keep copy pack local.
- Improve internal formatting.
- Produce approval checklist / Synthex handoff packet.
- Add Linear evidence comments only if explicitly enabled for this lane.

Requires Phill/operator approval before action:

- Sending to Toby or CCW.
- Scheduling or publishing through Synthex/CMS/social channels.
- Enabling paid ad spend.
- Adding pricing, promotions, stock claims, or tax/deduction claims.
- Mutating production CRM/tasks or external client-facing systems.

## 2026-05-29 01:00 AEST refresh

Current checkpoint:

- Re-validated the existing UNI-2055 copy pack and Synthex approval packet as a local-only content/campaign safe lane.
- Confirmed the copy pack still satisfies the Linear scope: 10 Facebook concepts, 3 service-booking posts, 3 urgency posts, 16 image/video briefs, accountant-safe guardrails, missing Toby/CCW inputs, and a no-scheduling/no-publishing boundary.
- Confirmed the approval packet has 16 Synthex draft queue slots, blocks public action, records `Synthex draft queue ID: not created`, and records `Scheduler/CMS/social post IDs: none`.
- No client-facing send, Synthex/CMS/social scheduling, public publishing, paid ad spend, pricing/promo claim, production CRM/task mutation, or external account/vendor action occurred.

Verification result:

```bash
python3 - <<'PY'
# PASS booleans:
# copy_has_10_facebook_concepts=True
# copy_has_3_service_posts=True
# copy_has_3_urgency_posts=True
# copy_image_brief_count_16=True
# copy_accountant_safe_guardrails=True
# copy_missing_toby_inputs=True
# copy_no_schedule_publish_boundary=True
# packet_has_16_queue_slots=True
# packet_blocks_public_action=True
# packet_has_scheduler_ids_none=True
# packet_has_synthex_draft_id_not_created=True
PY
```

Next approval-ready slice:

- If Phill approves moving the local packet forward, collect/confirm Toby stock priorities, workshop capacity, preferred CTA, approved assets, exclusions/promos, EOFY trading hours, and Facebook-first vs LinkedIn/Instagram expansion before creating any Synthex draft queue IDs.

## 2026-05-29 01:34 AEST refresh

Current checkpoint:

- Re-validated the existing UNI-2055 copy pack and Synthex approval packet as a local-only content/campaign safe lane.
- Corrected the local validation guardrail after an initial overly literal script falsely failed on label wording; the accepted contract is path/wording accurate to the current documents.
- Confirmed the copy pack still satisfies the Linear scope: 10 Facebook concepts, 3 service-booking posts, 3 urgency posts, 16 image/video briefs, accountant-safe guardrails, missing Toby/CCW inputs, and a no-scheduling/no-posting approval boundary.
- Confirmed the approval packet has 16 Synthex draft queue slots, blocks public action, records `Synthex draft queue ID: not created`, and records `Scheduler/CMS/social post IDs: none`.
- No client-facing send, Synthex/CMS/social scheduling, public publishing, paid ad spend, pricing/promo claim, production CRM/task mutation, or external account/vendor action occurred.

Verification result:

```bash
python3 corrected UNI-2055 approval-packet validation
# PASS booleans:
# copy_has_10_facebook_concepts=True
# copy_has_3_service_posts=True
# copy_has_3_urgency_posts=True
# copy_image_brief_count_16=True
# copy_accountant_safe_guardrails=True
# copy_missing_toby_inputs=True
# copy_no_schedule_publish_boundary=True
# packet_has_16_queue_slots=True
# packet_blocks_public_action=True
# packet_has_scheduler_ids_none=True
# packet_has_synthex_draft_id_not_created=True
# image_brief_count=16
```

Next approval-ready slice:

- If Phill approves moving the local packet forward, collect/confirm Toby stock priorities, workshop capacity, preferred CTA, approved assets, exclusions/promos, EOFY trading hours, and Facebook-first vs LinkedIn/Instagram expansion before creating any Synthex draft queue IDs.

## Next safe slice

Keep the local Synthex-ready approval packet current and approval-gated. Do not send, schedule, publish, or create scheduler/CMS/social IDs until explicit operator/client approval is recorded.

## 2026-05-29 01:18 AEST refresh

Current checkpoint:

- Re-validated the existing UNI-2055 copy pack and Synthex approval packet as a local-only content/campaign safe lane while PR #205 remains frozen by branch policy/review.
- Confirmed the copy pack still satisfies the Linear scope: 10 Facebook concepts, 3 service-booking posts, 3 urgency posts, 16 image/video briefs, accountant-safe guardrails, missing Toby/CCW inputs, and a no-scheduling/no-publishing boundary.
- Confirmed the approval packet has 16 Synthex draft queue slots, blocks public action, records `Synthex draft queue ID: not created`, and records `Scheduler/CMS/social post IDs: none`.
- No client-facing send, Synthex/CMS/social scheduling, public publishing, paid ad spend, pricing/promo claim, production CRM/task mutation, external account/vendor action, or GitHub/Vercel mutation occurred.

Verification result:

```bash
python3 - <<'PY'
# PASS booleans:
# copy_has_10_facebook_concepts=True
# copy_has_3_service_posts=True
# copy_has_3_urgency_posts=True
# copy_image_brief_count_16=True
# copy_accountant_safe_guardrails=True
# copy_missing_toby_inputs=True
# copy_no_schedule_publish_boundary=True
# packet_has_16_queue_slots=True
# packet_blocks_public_action=True
# packet_has_scheduler_ids_none=True
# packet_has_synthex_draft_id_not_created=True
PY
```

Next approval-ready slice:

- If Phill approves moving the local packet forward, collect/confirm Toby stock priorities, workshop capacity, preferred CTA, approved assets, exclusions/promos, EOFY trading hours, and Facebook-first vs LinkedIn/Instagram expansion before creating any Synthex draft queue IDs.
