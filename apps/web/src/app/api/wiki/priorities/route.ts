// GET /api/wiki/priorities — parse operational priorities from wiki_pages

import { NextRequest, NextResponse } from 'next/server'
import { getUser, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = await createClient()

  const { data: page } = await supabase
    .from('wiki_pages')
    .select('content')
    .eq('id', 'operational-priorities-q2-2026')
    .single()

  const content = page?.content ?? ''
  const tableRegex = /\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g
  const priorities: Array<{
    rank: number
    priority: string
    status: string
    alertCondition: string
  }> = []
  let match
  while ((match = tableRegex.exec(content)) !== null) {
    priorities.push({
      rank: parseInt(match[1]),
      priority: match[2].trim(),
      status: match[3].trim(),
      alertCondition: match[4].trim(),
    })
  }

  if (priorities.length === 0) {
    priorities.push(
      { rank: 1, priority: 'CCW client success — first paying external client', status: 'Active · $33k ARR', alertCondition: 'NPS <60 or response >30min' },
      { rank: 2, priority: 'RestoreAssist V1 Cutover — Phase 5 production', status: 'Pending Phill action', alertCondition: 'Not started by EOW' },
      { rank: 3, priority: 'Nexus Wave 1 — CCW portal live', status: 'In progress', alertCondition: 'CCW cannot log in and see data' },
      { rank: 4, priority: 'NRPG market presence', status: 'DR platform live', alertCondition: 'Adoption velocity stalling' },
      { rank: 5, priority: 'Synthex prosumer growth', status: '1,000+ users, NRR tracking', alertCondition: 'NRR <100% or churn spike' },
      { rank: 6, priority: 'CARSI compliance — first implementations', status: 'Deploying', alertCondition: 'GP-team Linear bloat detected' },
    )
  }

  return NextResponse.json({ priorities, count: priorities.length })
}
