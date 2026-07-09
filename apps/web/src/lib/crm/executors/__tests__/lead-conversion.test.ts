// UNI-2234 go-live — lead_conversion executor tests (fake founder-scoped client).
import { executeLeadConversion, type LeadConversionClient, type LeadRow } from '@/lib/crm/executors/lead-conversion'

function lead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 'lead_1',
    founder_id: 'f1',
    status: 'qualified',
    converted_at: null,
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    company: 'Analytical Engines',
    job_title: 'Founder',
    marketing_consent: true,
    ...overrides,
  }
}

interface Scripted {
  read?: { data: LeadRow | null; error: { message: string } | null }
  contact?: { data: { id: string } | null; error: { message: string } | null }
  updated?: { data: LeadRow | null; error: { message: string } | null }
}

function fakeClient(s: Scripted): LeadConversionClient {
  const single = <T>(v: T) => ({ single: async () => v })
  return {
    from(table: string) {
      if (table === 'crm_leads') {
        return {
          select: () => ({ eq: () => ({ eq: () => single(s.read ?? { data: null, error: null }) }) }),
          update: () => ({ eq: () => ({ eq: () => ({ select: () => single(s.updated ?? { data: null, error: null }) }) }) }),
        }
      }
      return { insert: () => ({ select: () => single(s.contact ?? { data: null, error: null }) }) }
    },
  } as unknown as LeadConversionClient
}

const ctx = (client: LeadConversionClient) => ({ client, founderId: 'f1', subjectId: 'lead_1', now: () => '2026-07-09T10:00:00.000Z' })

describe('executeLeadConversion', () => {
  it('converts a qualified lead: creates a client contact, marks converted, confirms read-back', async () => {
    const client = fakeClient({
      read: { data: lead(), error: null },
      contact: { data: { id: 'contact_9' }, error: null },
      updated: { data: lead({ status: 'converted', converted_at: '2026-07-09T10:00:00.000Z' }), error: null },
    })
    const res = await executeLeadConversion(ctx(client))
    expect(res).toEqual({ leadId: 'lead_1', contactId: 'contact_9', status: 'converted', convertedAt: '2026-07-09T10:00:00.000Z' })
  })

  it('throws when the lead is not found', async () => {
    const client = fakeClient({ read: { data: null, error: null } })
    await expect(executeLeadConversion(ctx(client))).rejects.toThrow(/not found/)
  })

  it('throws when the lead is already converted', async () => {
    const client = fakeClient({ read: { data: lead({ status: 'converted', converted_at: '2026-07-01T00:00:00Z' }), error: null } })
    await expect(executeLeadConversion(ctx(client))).rejects.toThrow(/already converted/)
  })

  it('throws when the lead status is not convertible', async () => {
    const client = fakeClient({ read: { data: lead({ status: 'disqualified' }), error: null } })
    await expect(executeLeadConversion(ctx(client))).rejects.toThrow(/not convertible/)
  })

  it('throws when the client-contact insert fails (no partial conversion)', async () => {
    const client = fakeClient({ read: { data: lead(), error: null }, contact: { data: null, error: { message: 'dupe' } } })
    await expect(executeLeadConversion(ctx(client))).rejects.toThrow(/contact insert failed/)
  })

  it('throws when the post-update read-back does not confirm converted', async () => {
    const client = fakeClient({
      read: { data: lead(), error: null },
      contact: { data: { id: 'c1' }, error: null },
      updated: { data: lead({ status: 'qualified' }), error: null },
    })
    await expect(executeLeadConversion(ctx(client))).rejects.toThrow(/did not confirm/)
  })

  it('throws when subjectId is missing', async () => {
    const client = fakeClient({})
    await expect(executeLeadConversion({ ...ctx(client), subjectId: '' })).rejects.toThrow(/subjectId/)
  })
})
