// The businesses in the group, in Phill's order (25/10/2026). Phill named Synthex himself, so this list is
// the one public place the name may appear; llms.txt, the JSON-LD, the sitemap and everything else stay clear.
// A name links only when its site answered 200 to `curl -s -o /dev/null -w '%{http_code}' -L` on 25/10/2026:
//   synthex.social 200, carsi.com.au 200, disasterrecovery.com.au 200, nrpg.business 200,
//   cleanexpo247-hall.vercel.app 200, restoreassist.app 200, ccwonline.com.au 200 (the address in
//   src/lib/campaigns/launch-lanes.ts; ccw.com.au returned 404 and is not used).
// An entry with no url is plain text, never a "#" link.

export type Business = { name: string; url?: string }

export const BUSINESSES: readonly Business[] = [
  { name: 'Synthex', url: 'https://www.synthex.social' },
  { name: 'CARSI', url: 'https://www.carsi.com.au' },
  { name: 'Disaster Recovery', url: 'https://www.disasterrecovery.com.au' },
  { name: 'NRPG', url: 'https://www.nrpg.business' },
  { name: 'Trade Hall', url: 'https://cleanexpo247-hall.vercel.app' },
  { name: 'RestoreAssist', url: 'https://restoreassist.app' },
  { name: 'CCW', url: 'https://ccwonline.com.au' },
  { name: 'and the ones to come' },
]
