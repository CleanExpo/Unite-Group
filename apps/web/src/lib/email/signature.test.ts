import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/margot/account-voice', () => ({
  getAccountVoice: vi.fn(),
  getAccountSlogan: vi.fn(),
}))

import { getAccountVoice, getAccountSlogan } from '@/lib/margot/account-voice'
import {
  buildSignatureParts,
  renderSignatureHtml,
  getAccountSignature,
  DEFAULT_SLOGAN,
} from './signature'

const DR_EMAIL = 'phill@disasterrecovery.com.au'
const PERSONAL_EMAIL = 'phill.mcgurk@gmail.com'

describe('buildSignatureParts', () => {
  it('resolves a business account with business, own domain, and siblings', () => {
    const parts = buildSignatureParts(DR_EMAIL, {
      signOff: 'Cheers, Phill',
      slogan: DEFAULT_SLOGAN,
      founderName: 'Phill',
    })
    expect(parts).not.toBeNull()
    expect(parts!.businessName).toBe('Disaster Recovery')
    expect(parts!.businessDomain).toBe('disasterrecovery.com.au')
    // Siblings EXCLUDE the account's own business…
    expect(parts!.siblings.some((s) => s.domain === 'disasterrecovery.com.au')).toBe(false)
    // …and every domain-less business (ato/itr never appear).
    expect(parts!.siblings.map((s) => s.domain)).toEqual(
      expect.arrayContaining([
        'nrpg.business',
        'carsi.com.au',
        'restoreassist.app',
        'synthex.social',
        'connexusm.com',
      ]),
    )
    expect(parts!.siblings).toHaveLength(5)
  })

  it('returns null for a personal account (no footer)', () => {
    expect(
      buildSignatureParts(PERSONAL_EMAIL, { signOff: 'x', slogan: 'y', founderName: 'z' }),
    ).toBeNull()
  })

  it('returns null for an unknown account', () => {
    expect(
      buildSignatureParts('nobody@nowhere.test', { signOff: 'x', slogan: 'y', founderName: 'z' }),
    ).toBeNull()
  })

  it('resolves the HQ mailbox as Unite-Group Nexus with every business as a sibling', () => {
    const parts = buildSignatureParts('contact@unite-group.in', {
      signOff: 'Cheers, Phill', slogan: 'y', founderName: 'Phill',
    })
    expect(parts?.businessName).toBe('Unite-Group Nexus')
    expect(parts?.businessDomain).toBe('unite-group.in')
    // HQ references every portfolio business — none excluded.
    expect(parts?.siblings.map((s) => s.name)).toEqual(
      ['Disaster Recovery', 'NRPG', 'CARSI', 'RestoreAssist', 'SYNTHEX', 'CCW'],
    )
  })

  it('never lists the HQ identity as a sibling on a portfolio account footer', () => {
    const parts = buildSignatureParts(DR_EMAIL, { signOff: 'x', slogan: 'y', founderName: 'z' })
    expect(parts?.siblings.map((s) => s.name)).not.toContain('Unite-Group Nexus')
  })
})

describe('renderSignatureHtml', () => {
  const parts = buildSignatureParts(DR_EMAIL, {
    signOff: 'Cheers, Phill',
    slogan: DEFAULT_SLOGAN,
    founderName: 'Phill',
  })!
  const html = renderSignatureHtml(parts)

  it('contains the logo absolute URL at width 120', () => {
    expect(html).toContain('/logos/unite-group-nexus-logo.png')
    expect(html).toContain('width="120"')
  })

  it('contains the slogan, sign-off, business name, own email and domain', () => {
    expect(html).toContain(DEFAULT_SLOGAN)
    expect(html).toContain('Cheers, Phill')
    expect(html).toContain('Disaster Recovery')
    expect(html).toContain('mailto:phill@disasterrecovery.com.au')
    expect(html).toContain('https://disasterrecovery.com.au')
  })

  it('contains sibling links but excludes domain-less businesses', () => {
    expect(html).toContain('https://nrpg.business')
    expect(html).toContain('https://carsi.com.au')
    expect(html).toContain('https://restoreassist.app')
    expect(html).toContain('https://synthex.social')
    expect(html).toContain('https://connexusm.com')
    expect(html).toContain('Unite-Group Nexus Pty Ltd')
    // ato / itr have no domain — they must not surface as links.
    expect(html).not.toContain('ATO App')
    expect(html).not.toContain('ITR-Button')
  })

  it('is email-safe: table layout, inline styles, no external classes', () => {
    expect(html).toContain('<table')
    expect(html).not.toContain('class=')
  })
})

describe('getAccountSignature', () => {
  beforeEach(() => vi.clearAllMocks())

  const VOICE = {
    name: 'Phill',
    signOff: 'Cheers, Phill',
    toneGuidelines: [],
    neverDo: [],
  }

  it('renders using the stored slogan for a business account', async () => {
    vi.mocked(getAccountVoice).mockResolvedValue(VOICE)
    vi.mocked(getAccountSlogan).mockResolvedValue('Stored slogan')
    const html = await getAccountSignature('founder-1', DR_EMAIL)
    expect(html).toContain('Stored slogan')
    expect(html).toContain('Cheers, Phill')
  })

  it('opts.slogan overrides the stored slogan', async () => {
    vi.mocked(getAccountVoice).mockResolvedValue(VOICE)
    vi.mocked(getAccountSlogan).mockResolvedValue('Stored slogan')
    const html = await getAccountSignature('founder-1', DR_EMAIL, { slogan: 'Preview line' })
    expect(html).toContain('Preview line')
    expect(html).not.toContain('Stored slogan')
  })

  it('falls back to DEFAULT_SLOGAN when none is stored', async () => {
    vi.mocked(getAccountVoice).mockResolvedValue(VOICE)
    vi.mocked(getAccountSlogan).mockResolvedValue(null)
    const html = await getAccountSignature('founder-1', DR_EMAIL)
    expect(html).toContain(DEFAULT_SLOGAN)
  })

  it('returns empty string for a personal account without any lookup', async () => {
    const html = await getAccountSignature('founder-1', PERSONAL_EMAIL)
    expect(html).toBe('')
    expect(getAccountVoice).not.toHaveBeenCalled()
    expect(getAccountSlogan).not.toHaveBeenCalled()
  })
})
