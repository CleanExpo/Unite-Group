/**
 * Own Kanban board store (WS2 P3). Founder-session (server client) so every
 * query is founder_id-scoped and RLS-enforced. Uses the pure fractional
 * ordering (order.ts) so a create appends to a column and a move computes ONE
 * new position. Edge (needs the kanban_task migration applied); the ordering
 * logic is unit-tested separately.
 */

import { createClient } from '@/lib/supabase/server';

import { positionForIndex } from './order';
import type { Task, TaskStatus } from '@/types/kanban';

export interface CreateTaskInput {
  title: string;
  status?: TaskStatus;
  priority?: Task['priority'];
  description?: string;
  businessKey?: string;
  sourceMessageId?: string;
  sourceDraftId?: string;
}

export async function listTasks(founderId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('kanban_task')
    .select('*')
    .eq('founder_id', founderId)
    .order('status', { ascending: true })
    .order('position', { ascending: true });
  if (error) throw new Error(`kanban_task list: ${error.message}`);
  return (data ?? []) as unknown as Task[];
}

async function columnPositions(
  founderId: string,
  status: TaskStatus,
  excludeId?: string
): Promise<number[]> {
  const supabase = await createClient();
  let q = supabase
    .from('kanban_task')
    .select('position')
    .eq('founder_id', founderId)
    .eq('status', status)
    .order('position', { ascending: true });
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`kanban_task positions: ${error.message}`);
  return (data ?? []).map((r: { position: number }) => r.position);
}

export async function createTask(
  founderId: string,
  input: CreateTaskInput
): Promise<string> {
  const status = input.status ?? 'todo';
  const positions = await columnPositions(founderId, status);
  const position = positionForIndex(positions, positions.length); // append
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('kanban_task')
    .insert({
      founder_id: founderId,
      title: input.title,
      description: input.description ?? null,
      status,
      priority: input.priority ?? 'medium',
      business_key: input.businessKey ?? null,
      source_message_id: input.sourceMessageId ?? null,
      source_draft_id: input.sourceDraftId ?? null,
      position,
    })
    .select('id')
    .single();
  if (error) throw new Error(`kanban_task insert: ${error.message}`);
  return data.id as string;
}

export async function moveTask(
  founderId: string,
  id: string,
  toStatus: TaskStatus,
  toIndex: number
): Promise<void> {
  const positions = await columnPositions(founderId, toStatus, id);
  const position = positionForIndex(positions, toIndex);
  const supabase = await createClient();
  const { error } = await supabase
    .from('kanban_task')
    .update({ status: toStatus, position, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('founder_id', founderId);
  if (error) throw new Error(`kanban_task move: ${error.message}`);
}
