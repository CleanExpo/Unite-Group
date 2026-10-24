// The businesses in the group, in Phill's order (25/10/2026). Phill named Synthex himself, so this list is
// the one public place the name may appear; llms.txt, the JSON-LD, the sitemap, the page metadata and everything
// else stay clear. A name links only when its site answered 200 to `curl -s -o /dev/null -w '%{http_code}' -L`
// on 25/10/2026:
//   synthex.social 200, carsi.com.au 200, disasterrecovery.com.au 200, nrpg.business 200,
//   cleanexpo247-hall.vercel.app 200, restoreassist.app 200, ccwonline.com.au 200 (the address in
//   src/lib/campaigns/launch-lanes.ts; ccw.com.au returned 404 and is not used).
// An entry with no url is plain text, never a "#" link.
//
// `tile: true` marks the six businesses shown as shards of the U, in this order (see story.tsx).
// `logo` is a file in public/landing/logos, a resize of an existing logo file (see public/landing/logos/README.md
// for each source). No logo is drawn or generated. An entry with no `logo` gets a clean
// text wordmark tile: Trade Hall has no logo file in the repo or on the web.

export type Business = { name: string; url?: string; tile?: true; logo?: string; host?: string; line?: string }

// Phill 25/10/2026: the one approved description of Disaster Recovery. Defined here and used from here only;
// no hours, certification or standards claim (a test holds that).
export const DR_LINE =
  'professional water damage restoration and mould specialists connecting homes and businesses across Australia and New Zealand with professional restoration companies through the NRPG network'

export const BUSINESSES: readonly Business[] = [
  { name: 'Synthex', url: 'https://www.synthex.social', tile: true, logo: '/landing/logos/synthex.webp' },
  { name: 'CARSI', url: 'https://www.carsi.com.au', tile: true, logo: '/landing/logos/carsi.webp' },
  { name: 'Disaster Recovery', url: 'https://www.disasterrecovery.com.au', line: DR_LINE, tile: true, logo: '/landing/logos/disaster-recovery.webp' },
  { name: 'NRPG', url: 'https://www.nrpg.business', tile: true, logo: '/landing/logos/nrpg-symbol.svg' },
  { name: 'Trade Hall', url: 'https://cleanexpo247-hall.vercel.app', tile: true },
  { name: 'RestoreAssist', url: 'https://restoreassist.app', tile: true, logo: '/landing/logos/restoreassist.webp' },
  { name: 'CCW', url: 'https://ccwonline.com.au' },
  { name: 'and the ones to come' },
]

export const TILES = BUSINESSES.filter((b) => b.tile)
export const ALSO = BUSINESSES.filter((b) => !b.tile)
