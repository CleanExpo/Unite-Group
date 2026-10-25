import type { VisualSlot } from './visuals'

// The supporting picture beside "What it will do", one per pillar and never the pillar's own hero. Conversion has the card poster instead.
export const SUPPORTING_SLOT: Partial<Record<string, VisualSlot>> = {
  visibility: 'stepPick',
  experience: 'stepSend',
  intelligence: 'stepApprove',
}
