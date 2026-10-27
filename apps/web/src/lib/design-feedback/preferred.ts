// Feed-back step of the design loop: the living-card film a new client starts on.
// Returns null (today's behaviour: nothing pre-selected) unless armed and a lesson has earned it.

import { EDITIONS } from '@/app/cards/editions'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import { isDesignLessonsArmed } from './arming'
import { pickDefaultTemplate } from './lessons'
import { loadLatestLessons } from './store'

type Client = Parameters<typeof loadLatestLessons>[0]

export async function loadPreferredEdition(
  env: NodeJS.ProcessEnv = process.env,
  makeClient: () => Client = createServiceClient,
): Promise<string | null> {
  if (!isDesignLessonsArmed(env)) return null
  // Owner scoping (apps/web/CLAUDE.md): only the founder's own lessons; unset founder means no pre-selection.
  const founderId = getFounderUserId(env)
  if (!founderId) return null
  try {
    const lessons = await loadLatestLessons(makeClient(), founderId)
    return pickDefaultTemplate(lessons, 'card', EDITIONS.map((e) => e.name))
  } catch {
    return null
  }
}
