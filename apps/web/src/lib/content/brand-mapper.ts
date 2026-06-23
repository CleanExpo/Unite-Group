// src/lib/content/brand-mapper.ts
// Map brand DB row (snake_case) → BrandIdentity (camelCase).
// Single source of truth — used by the content-build lane and the
// POST /api/content/generate route.

import type { BrandIdentity } from '@/lib/content/types'

export function mapBrand(brand: Record<string, unknown>): BrandIdentity {
  return {
    id: brand.id as string,
    founderId: brand.founder_id as string,
    businessKey: brand.business_key as string,
    toneOfVoice: brand.tone_of_voice as string,
    targetAudience: brand.target_audience as string,
    industryKeywords: brand.industry_keywords as string[],
    uniqueSellingPoints: brand.unique_selling_points as string[],
    characterMale: brand.character_male as { name: string; persona: string; avatarUrl: string | null; voiceStyle: string },
    characterFemale: brand.character_female as { name: string; persona: string; avatarUrl: string | null; voiceStyle: string },
    colourPrimary: brand.colour_primary as string | null,
    colourSecondary: brand.colour_secondary as string | null,
    doList: brand.do_list as string[],
    dontList: brand.dont_list as string[],
    sampleContent: brand.sample_content as Record<string, unknown>,
    createdAt: brand.created_at as string,
    updatedAt: brand.updated_at as string,
  }
}
