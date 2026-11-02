// Shared shapes for the owner portal change-request editor (UNI-3168).
// PortalOwner and Entitlements are the contract agreed across the three portal jobs (S1 owner/guard, S2 plans,
// S3 this folder). S1 and S2 provide the real functions; until they merge, owner-stub.ts stands in.

export type PortalPlan = 'comp' | 'paid' | 'none'
export type Aal = 'aal1' | 'aal2'

export type PortalOwner = {
  userId: string
  ownerId: string
  tenantSlug: string
  plan: PortalPlan
  aal: Aal
}

export type PortalModule = 'content' | 'seo' | 'social' | 'voice'
export type Entitlements = { plan: PortalPlan; modules: Record<PortalModule, boolean> }

export const CHANGE_STATUSES = [
  'submitted',
  'in_progress',
  'preview_ready',
  'approved',
  'published',
  'rejected',
  'rolled_back',
] as const
export type ChangeStatus = (typeof CHANGE_STATUSES)[number]

/** Pages the owner can pick. "other" lets her describe a page we have not listed yet. */
export const CHANGE_PAGES = [
  { value: 'home', label: 'Home page' },
  { value: 'about', label: 'About us' },
  { value: 'courses', label: 'Courses and dates' },
  { value: 'trainers', label: 'Trainers' },
  { value: 'contact', label: 'Contact details' },
  { value: 'other', label: 'Another page' },
] as const
export type ChangePage = (typeof CHANGE_PAGES)[number]['value']

export type ChangeRequest = {
  id: string
  tenantSlug: string
  page: ChangePage
  requestText: string
  photoPath: string | null
  status: ChangeStatus
  previewUrl: string | null
  editNote: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
}
