// src/lib/studio/studio-brand.ts
//
// Resolves the founder's brand context for the Visual Campaign Studio: a ready
// brand_profiles row mapped to a lightweight StudioBrand (for the campaign link)
// and a BrandDNA (for the image generator). Returns null when there is no ready
// profile or the choice is ambiguous — the studio then shows a brand picker.

import { createClient } from '@/lib/supabase/server'
import type { BrandDNA, BrandColours, BrandFonts } from '@/lib/campaigns/types'

export interface StudioBrand {
  brandProfileId: string
  organizationId: string | null
  businessKey: string | null
  clientName: string
}

type SupabaseLike = { from: (table: string) => unknown }

const BRAND_COLUMNS =
  'id, organization_id, client_name, website_url, logo_url, industry, business_key, status, ' +
  'tone_of_voice, brand_values, colours, fonts, tagline, target_audience, imagery_style, reference_images'

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function mapBrand(row: Record<string, unknown>): StudioBrand {
  return {
    brandProfileId: str(row.id),
    organizationId: typeof row.organization_id === 'string' ? row.organization_id : null,
    businessKey: typeof row.business_key === 'string' ? row.business_key : null,
    clientName: str(row.client_name),
  }
}

function mapBrandDNA(row: Record<string, unknown>): BrandDNA {
  return {
    clientName: str(row.client_name),
    websiteUrl: str(row.website_url),
    logoUrl: typeof row.logo_url === 'string' ? row.logo_url : null,
    colours: (row.colours ?? {}) as BrandColours,
    fonts: (row.fonts ?? {}) as BrandFonts,
    toneOfVoice: str(row.tone_of_voice),
    brandValues: Array.isArray(row.brand_values) ? (row.brand_values as string[]) : [],
    tagline: typeof row.tagline === 'string' ? row.tagline : null,
    targetAudience: str(row.target_audience),
    industry: str(row.industry),
    imageryStyle: str(row.imagery_style),
    referenceImages: Array.isArray(row.reference_images) ? (row.reference_images as string[]) : [],
  }
}

export async function resolveStudioBrand(
  input: { founderId: string; businessKey?: string | null },
  client?: SupabaseLike,
): Promise<{ brand: StudioBrand; brandDNA: BrandDNA } | null> {
  const db = client ?? ((await createClient()) as unknown as SupabaseLike)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (db.from('brand_profiles') as any)
    .select(BRAND_COLUMNS)
    .eq('founder_id', input.founderId)
    .eq('status', 'ready')
  if (input.businessKey) {
    query = query.eq('business_key', input.businessKey)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(2)
  if (error || !Array.isArray(data) || data.length === 0) return null

  const rows = data as Array<Record<string, unknown>>
  // With a businessKey we take the most recent match; without one we only
  // proceed when the choice is unambiguous (exactly one ready profile).
  const row = input.businessKey ? rows[0] : rows.length === 1 ? rows[0] : null
  if (!row) return null

  return { brand: mapBrand(row), brandDNA: mapBrandDNA(row) }
}
