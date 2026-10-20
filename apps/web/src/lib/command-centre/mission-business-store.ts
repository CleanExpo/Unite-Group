import { createClient } from '@/lib/supabase/server'
import { getBusinessByKey, type BusinessKey } from '@/lib/businesses'
import { getTaskById, type CommandCentreTask } from './tasks'
import { isDeliveryMission, readDeliveryMetadata } from './delivery-types'
import { DeliveryConflict, hashDeliveryInput, type DeliveryMutationClient, type DeliveryStoreClient } from './delivery-store'
import { isPreparationLeaseActive } from './intent-store'

/** File a mission without changing its delivery repository, evidence or authority. */
export async function saveMissionBusiness(task: CommandCentreTask, businessKey: BusinessKey | null, options: { client?: DeliveryStoreClient } = {}) {
  if (!isDeliveryMission(task) || (businessKey !== null && !getBusinessByKey(businessKey))) throw new DeliveryConflict('Choose a registered business for this mission.')
  if (isPreparationLeaseActive(task)) throw new DeliveryConflict('Preparation is running. Refresh before changing the business.')
  const metadata = { ...task.metadata, businessKey }
  const db = options.client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(task.updated_at) + 1)).toISOString()
  let query = (db as DeliveryMutationClient).from('cc_tasks').update({ metadata, updated_at: updatedAt })
    .eq('founder_id', task.founder_id).eq('id', task.id).eq('status', task.status).eq('updated_at', task.updated_at)
  const delivery = readDeliveryMetadata(task)
  if (delivery) query = query.eq('metadata->delivery->>revision', String(delivery.revision))
  const { data, error } = await query.select('*')
  if (error) throw new Error('Business assignment persistence is unavailable.')
  if (!Array.isArray(data) || data.length !== 1) throw new DeliveryConflict()
  const returned = data[0] as CommandCentreTask
  const confirmed = await getTaskById({ founderId: task.founder_id, taskId: task.id }, db)
  if (!confirmed || confirmed.id !== task.id || confirmed.founder_id !== task.founder_id ||
    confirmed.updated_at !== returned.updated_at || confirmed.status !== task.status ||
    confirmed.project_key !== task.project_key || hashDeliveryInput(confirmed.metadata) !== hashDeliveryInput(metadata)) {
    throw new DeliveryConflict('The business assignment could not be confirmed. Refresh before retrying.')
  }
  return confirmed
}
