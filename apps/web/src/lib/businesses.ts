// src/lib/businesses.ts
// repoUrl: canonical GitHub repo per owned business — the hub sweep's default
// when no repo_url has been set on the satellite row, so GitHub last-commit
// data is live without manual seeding.
export const BUSINESSES = [
  { key: 'dr',      name: 'Disaster Recovery',   color: '#ef4444', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/Disaster-Recovery' },
  { key: 'nrpg',   name: 'NRPG',                color: '#f97316', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/DR-NRPG' },
  { key: 'carsi',  name: 'CARSI',               color: '#eab308', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/CARSI' },
  { key: 'restore', name: 'RestoreAssist',       color: '#22c55e', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/RestoreAssist' },
  { key: 'synthex', name: 'SYNTHEX',             color: '#f97316', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/Synthex' },
  { key: 'ato',    name: 'ATO App',              color: '#3b82f6', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/ATO' },
  { key: 'itr',    name: 'ITR-Button',           color: '#6366f1', status: 'active', type: 'owned', repoUrl: 'https://github.com/CleanExpo/ITR-Button' },
  { key: 'ccw',    name: 'CCW-ERP/CRM',          color: '#DDA0DD', status: 'active', type: 'client', repoUrl: 'https://github.com/CleanExpo/CCW-CRM' },
] as const

export type BusinessKey = typeof BUSINESSES[number]['key']
export type BusinessType = typeof BUSINESSES[number]['type']
export type Business = typeof BUSINESSES[number]

export const OWNED_BUSINESSES = BUSINESSES.filter((business) => business.type === 'owned')
export const CLIENT_BUSINESSES = BUSINESSES.filter((business) => business.type === 'client')

export function getBusinessByKey(key: string): Business | undefined {
  return BUSINESSES.find((business) => business.key === key)
}

export function isOwnedBusinessKey(key: string): key is BusinessKey {
  return OWNED_BUSINESSES.some((business) => business.key === key)
}
