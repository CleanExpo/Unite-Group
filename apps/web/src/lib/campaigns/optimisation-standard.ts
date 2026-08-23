export interface SynthexOptimisationStandard {
  version: 1
  searchPrinciple: string
  schemaTypes: string[]
  approvalChecks: string[]
  prohibitedPractices: string[]
}

const BASE_SCHEMA = ['Organization', 'BreadcrumbList', 'Article', 'VideoObject']

const SCHEMA_BY_BUSINESS: Record<string, string[]> = {
  ccw: ['Product', 'Offer', 'LocalBusiness'],
  carsi: ['Course'],
  restore: ['SoftwareApplication'],
}

/**
 * Current Synthex search standard.
 *
 * Google treats AEO and GEO work as part of SEO. There is no separate GEO
 * schema type, so the machine uses truthful, supported schema.org types and a
 * people-first evidence gate instead of invented markup.
 */
export function buildSynthexOptimisationStandard(businessKey: string): SynthexOptimisationStandard {
  return {
    version: 1,
    searchPrinciple: 'People-first SEO covering search, answer and generative discovery',
    schemaTypes: [...BASE_SCHEMA, ...(SCHEMA_BY_BUSINESS[businessKey] ?? [])],
    approvalChecks: [
      'Named author and reviewer with relevant experience',
      'Claim-level sources and evidence',
      'First-hand photos, examples, tests or business data where available',
      'Accurate published and reviewed dates',
      'AI-assistance disclosure when readers would reasonably expect it',
      'Crawlable content with canonical URL, sitemap entry and internal links',
      'Visible content matches JSON-LD',
      'Image alt text and video captions are present',
      'Structured data passes Rich Results validation where supported',
    ],
    prohibitedPractices: [
      'Invented facts, testimonials, prices, stock, qualifications or results',
      'Thin pages created only for query variations',
      'Purchased, artificial or deceptive backlinks',
      'Unsupported schema properties or hidden JSON-LD claims',
    ],
  }
}
