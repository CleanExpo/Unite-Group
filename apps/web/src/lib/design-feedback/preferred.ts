// Feed-back step of the design loop: the living-card film a new client starts on.
// Returns null (today's behaviour: nothing pre-selected) unless armed and a lesson has earned it.

import { EDITIONS } from '@/app/cards/editions'
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
  try {
    const lessons = await loadLatestLessons(makeClient())
    return pickDefaultTemplate(lessons, 'card', EDITIONS.map((e) => e.name))
  } catch {
    return null
  }
}
