import { describe, it, expect } from 'vitest'
import { mapBrand } from '../brand-mapper'

describe('mapBrand', () => {
  it('maps a snake_case brand row to a camelCase BrandIdentity, incl. nested characters and nulls', () => {
    const row: Record<string, unknown> = {
      id: 'brand-1',
      founder_id: 'founder-1',
      business_key: 'biz-1',
      tone_of_voice: 'professional',
      target_audience: 'SMBs',
      industry_keywords: ['marketing', 'AI'],
      unique_selling_points: ['AI-powered', 'fast'],
      character_male: { name: 'Bob', persona: 'advisor', avatarUrl: null, voiceStyle: 'calm' },
      character_female: { name: 'Alice', persona: 'coach', avatarUrl: 'https://x/y.png', voiceStyle: 'warm' },
      colour_primary: '#00F5FF',
      colour_secondary: null,
      do_list: ['be direct'],
      dont_list: ['be vague'],
      sample_content: { foo: 'bar' },
      created_at: '2026-06-22T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
    }

    expect(mapBrand(row)).toEqual({
      id: 'brand-1',
      founderId: 'founder-1',
      businessKey: 'biz-1',
      toneOfVoice: 'professional',
      targetAudience: 'SMBs',
      industryKeywords: ['marketing', 'AI'],
      uniqueSellingPoints: ['AI-powered', 'fast'],
      characterMale: { name: 'Bob', persona: 'advisor', avatarUrl: null, voiceStyle: 'calm' },
      characterFemale: { name: 'Alice', persona: 'coach', avatarUrl: 'https://x/y.png', voiceStyle: 'warm' },
      colourPrimary: '#00F5FF',
      colourSecondary: null,
      doList: ['be direct'],
      dontList: ['be vague'],
      sampleContent: { foo: 'bar' },
      createdAt: '2026-06-22T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    })
  })

  it('passes through null colours without coercion', () => {
    const row: Record<string, unknown> = {
      id: 'b',
      founder_id: 'f',
      business_key: 'k',
      tone_of_voice: 't',
      target_audience: 'a',
      industry_keywords: [],
      unique_selling_points: [],
      character_male: { name: 'M', persona: 'p', avatarUrl: null, voiceStyle: 'v' },
      character_female: { name: 'F', persona: 'p', avatarUrl: null, voiceStyle: 'v' },
      colour_primary: null,
      colour_secondary: null,
      do_list: [],
      dont_list: [],
      sample_content: {},
      created_at: '2026-06-23T00:00:00.000Z',
      updated_at: '2026-06-23T00:00:00.000Z',
    }

    const result = mapBrand(row)
    expect(result.colourPrimary).toBeNull()
    expect(result.colourSecondary).toBeNull()
  })
})
