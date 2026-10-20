import { getBusinessByKey, type BusinessKey } from '@/lib/businesses'

/** Business filing is separate from the repository/project used for delivery. */
export function readMissionBusiness(metadata: Record<string, unknown>): BusinessKey | null {
  return typeof metadata.businessKey === 'string' ? getBusinessByKey(metadata.businessKey)?.key ?? null : null
}
