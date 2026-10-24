import { expectTypeOf, it } from 'vitest'
import { notify, type NotifyResult, type LeadAlertPayload } from '..'

it('preserves the legacy void return', () => {
expectTypeOf(notify({ type: 'cron_complete', title: 'Done', body: 'Done', severity: 'info' })).toEqualTypeOf<Promise<void>>()
})
it('allows only the minimal lead payload and returns a result', () => {
const lead = { type: 'new_lead', leadId: 'lead-id', firstName: 'First', businessName: null, interests: null, capturedAt: '2026-10-24T00:00:00Z' } satisfies LeadAlertPayload
expectTypeOf(notify(lead)).toEqualTypeOf<Promise<NotifyResult>>()
// @ts-expect-error Email must never be part of the alert payload.
notify({ ...lead, email: 'private@example.invalid' })
// @ts-expect-error Surname must never be part of the alert payload.
notify({ ...lead, surname: 'Private' })
// @ts-expect-error Message must never be part of the alert payload.
notify({ ...lead, message: 'Private' })
expectTypeOf<keyof LeadAlertPayload>().toEqualTypeOf<'type' | 'leadId' | 'firstName' | 'businessName' | 'interests' | 'capturedAt'>()
})
