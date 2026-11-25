'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { assignCardsVariant, trackCardsExposure } from '@/components/analytics/site-tracker'

/**
 * The /cards experiment switch (UNI-3293). The server renders the control (A, the current showroom) and, only
 * while the experiment flag is on, the treatment (B). With no treatment this is a plain pass-through. In the
 * browser the tab's arm is assigned once, kept for the tab, and one exposure is recorded per page view for the
 * visitor's arm. A visitor who opted out (Do Not Track, Global Privacy Control) sees A and is not recorded.
 */
export function CardsAbGate({ control, treatment }: { control: ReactNode; treatment?: ReactNode }) {
  const [arm, setArm] = useState<'A' | 'B'>('A')
  const exposed = useRef(false) // a ref survives the development double-run of effects: one exposure per mount

  useEffect(() => {
    if (!treatment) return
    setArm(assignCardsVariant())
    if (!exposed.current) {
      exposed.current = true
      trackCardsExposure()
    }
  }, [treatment])

  return <>{arm === 'B' && treatment ? treatment : control}</>
}
