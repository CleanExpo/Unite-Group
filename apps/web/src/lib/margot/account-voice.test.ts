import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory stand-in for the service-role client. Hoisted so the vi.mock
// factory can close over it. Keyed on the (founder_id, account_email) composite
// — the same key the real UNIQUE index enforces.
const { store } = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from() {
      const filters: Record<string, string> = {}
      const q = {
        select: () => q,
        eq: (col: string, val: string) => {
          filters[col] = val
          return q
        },
        maybeSingle: async () => ({
          data:
            store.get(`${filters.founder_id}::${filters.account_email}`) ?? null,
          error: null,
        }),
        upsert: async (row: Record<string, unknown>) => {
          // Composite-key upsert: same (founder, account) overwrites, never dupes.
          store.set(`${row.founder_id}::${row.account_email}`, row)
          return { error: null }
        },
      }
      return q
    },
  }),
}))

import {
  getAccountVoice,
  getStoredAccountVoice,
  saveAccountVoice,
  getAccountAgentEnabled,
  setAccountAgentEnabled,
  DEFAULT_FOUNDER_VOICE,
} from './account-voice'
import type { FounderVoice } from './draft-reply-prompt'

const FOUNDER = 'founder-1'
const ACCOUNT_A = 'dr@disasterrecovery.com.au'
const ACCOUNT_B = 'carsi@carsi.com.au'

const voiceA: FounderVoice = {
  name: 'Phill (DR)',
  signOff: 'Cheers, Phill',
  toneGuidelines: ['Urgent, reassuring, restoration tone.'],
  neverDo: ['Never quote a price without an assessment.'],
}
const voiceB: FounderVoice = {
  name: 'Phill (CARSI)',
  signOff: 'Kind regards, Phill',
  toneGuidelines: ['Educational, training-provider tone.'],
  neverDo: ['Never imply accreditation not held.'],
}

describe('account-voice accessor (task 21)', () => {
  beforeEach(() => {
    store.clear()
  })

  it('getAccountVoice returns the labelled default when the account is unset', async () => {
    const voice = await getAccountVoice(FOUNDER, ACCOUNT_A)
    expect(voice).toEqual(DEFAULT_FOUNDER_VOICE)
    // the default folds in the nexus-copywriter register
    expect(voice.toneGuidelines.join(' ')).toMatch(/concise/i)
    expect(voice.toneGuidelines.join(' ')).toMatch(/evidence-honest/i)
  })

  it('getStoredAccountVoice returns null when unset (distinguishes default from custom)', async () => {
    expect(await getStoredAccountVoice(FOUNDER, ACCOUNT_A)).toBeNull()
  })

  it('getAccountVoice returns the stored voice once set', async () => {
    await saveAccountVoice(FOUNDER, ACCOUNT_A, voiceA)
    expect(await getAccountVoice(FOUNDER, ACCOUNT_A)).toEqual(voiceA)
  })

  it('ISOLATION: account A never receives account B’s voice', async () => {
    await saveAccountVoice(FOUNDER, ACCOUNT_A, voiceA)
    await saveAccountVoice(FOUNDER, ACCOUNT_B, voiceB)

    const resolvedA = await getAccountVoice(FOUNDER, ACCOUNT_A)
    const resolvedB = await getAccountVoice(FOUNDER, ACCOUNT_B)

    expect(resolvedA).toEqual(voiceA)
    expect(resolvedB).toEqual(voiceB)
    // the crux: A must NOT bleed B's voice
    expect(resolvedA).not.toEqual(voiceB)
    expect(resolvedA.name).not.toBe(voiceB.name)
  })

  it('saveAccountVoice upserts on the composite key — no duplicate rows', async () => {
    await saveAccountVoice(FOUNDER, ACCOUNT_A, voiceA)
    await saveAccountVoice(FOUNDER, ACCOUNT_A, {
      ...voiceA,
      signOff: 'Regards, Phill',
    })
    // one account key, one row — the second save overwrote the first
    expect(store.size).toBe(1)
    expect((await getAccountVoice(FOUNDER, ACCOUNT_A)).signOff).toBe(
      'Regards, Phill',
    )
  })

  it('regression guard: a per-account resolver callback keeps voices isolated', async () => {
    await saveAccountVoice(FOUNDER, ACCOUNT_A, voiceA)
    await saveAccountVoice(FOUNDER, ACCOUNT_B, voiceB)

    // mirrors the drafts route: resolve voice per target account
    const resolve = (email: string) => getAccountVoice(FOUNDER, email)
    const resolved = await Promise.all([ACCOUNT_A, ACCOUNT_B].map(resolve))

    expect(resolved[0]).toEqual(voiceA)
    expect(resolved[1]).toEqual(voiceB)
    expect(resolved[0]).not.toEqual(resolved[1])
  })
})

describe('per-account auto-draft toggle (Slice 2)', () => {
  beforeEach(() => {
    store.clear()
  })

  it('defaults to false (dark) when the account is unset', async () => {
    expect(await getAccountAgentEnabled(FOUNDER, ACCOUNT_A)).toBe(false)
  })

  it('reflects the stored flag once set', async () => {
    await setAccountAgentEnabled(FOUNDER, ACCOUNT_A, true)
    expect(await getAccountAgentEnabled(FOUNDER, ACCOUNT_A)).toBe(true)
    await setAccountAgentEnabled(FOUNDER, ACCOUNT_A, false)
    expect(await getAccountAgentEnabled(FOUNDER, ACCOUNT_A)).toBe(false)
  })

  it('ISOLATION: turning A on never turns B on', async () => {
    await setAccountAgentEnabled(FOUNDER, ACCOUNT_A, true)
    expect(await getAccountAgentEnabled(FOUNDER, ACCOUNT_A)).toBe(true)
    expect(await getAccountAgentEnabled(FOUNDER, ACCOUNT_B)).toBe(false)
  })

  it('is founder-scoped — every read/write filters on founder_id', async () => {
    await setAccountAgentEnabled(FOUNDER, ACCOUNT_A, true)
    // a different founder never sees founder-1's flag
    expect(await getAccountAgentEnabled('founder-2', ACCOUNT_A)).toBe(false)
  })
})
