'use client'

import { Suspense } from 'react'
import { MissionControlShell } from '@/app/(founder)/founder/command-centre/MissionControlShell'
import { BookkeeperWorkbench } from './BookkeeperWorkbench'

export function BookkeeperView() {
  return <MissionControlShell section="finance" title="Bookkeeper" description="Reconciliation and financial reporting across your businesses.">
    <Suspense fallback={<p role="status">Loading bookkeeper…</p>}><BookkeeperWorkbench /></Suspense>
  </MissionControlShell>
}
