// src/lib/businesses.ts
export const BUSINESSES = [
  { key: 'dr',      name: 'Disaster Recovery',   color: '#ef4444', status: 'active', type: 'owned'  },
  { key: 'nrpg',   name: 'NRPG',                color: '#f97316', status: 'active', type: 'owned'  },
  { key: 'carsi',  name: 'CARSI',               color: '#eab308', status: 'active', type: 'owned'  },
  { key: 'restore', name: 'RestoreAssist',       color: '#22c55e', status: 'active', type: 'owned'  },
  { key: 'synthex', name: 'SYNTHEX',             color: '#a855f7', status: 'active', type: 'owned'  },
  { key: 'ato',    name: 'ATO App',              color: '#3b82f6', status: 'active', type: 'owned'  },
  { key: 'ccw',    name: 'CCW-ERP/CRM',          color: '#DDA0DD', status: 'active', type: 'client' },
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
