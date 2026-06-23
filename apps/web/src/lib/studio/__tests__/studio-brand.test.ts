import { describe, it, expect, vi } from 'vitest'
import { resolveStudioBrand } from '../studio-brand'

function client(rows: unknown[]) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order']) b[m] = vi.fn(() => b)
  b.limit = vi.fn(async () => ({ data: rows, error: null }))
  return { from: vi.fn(() => b) }
}

const row = {
  id: 'b1', organization_id: 'o1', business_key: 'synthex', client_name: 'Synthex',
  website_url: 'https://synthex.test', logo_url: null, industry: 'tech', status: 'ready',
  tone_of_voice: 'bold', brand_values: ['fast'], colours: { primary: '#00F5FF' }, fonts: { body: 'Inter' },
  tagline: null, target_audience: 'founders', imagery_style: 'clean', reference_images: [],
}

describe('resolveStudioBrand', () => {
  it('maps a single ready profile to brand + brandDNA', async () => {
    const r = await resolveStudioBrand({ founderId: 'u1' }, client([row]) as never)
    expect(r?.brand).toEqual({ brandProfileId: 'b1', organizationId: 'o1', businessKey: 'synthex', clientName: 'Synthex' })
    expect(r?.brandDNA.clientName).toBe('Synthex')
    expect(r?.brandDNA.toneOfVoice).toBe('bold')
    expect(r?.brandDNA.brandValues).toEqual(['fast'])
  })

  it('returns null when none are ready', async () => {
    expect(await resolveStudioBrand({ founderId: 'u1' }, client([]) as never)).toBeNull()
  })

  it('returns null when ambiguous (two ready, no businessKey)', async () => {
    expect(await resolveStudioBrand({ founderId: 'u1' }, client([row, { ...row, id: 'b2' }]) as never)).toBeNull()
  })

  it('returns the first match when a businessKey is given', async () => {
    const r = await resolveStudioBrand({ founderId: 'u1', businessKey: 'synthex' }, client([row, { ...row, id: 'b2' }]) as never)
    expect(r?.brand.brandProfileId).toBe('b1')
  })
})
