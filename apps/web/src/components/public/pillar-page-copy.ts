import type { Pillar } from '@/lib/public-site'

export type PillarChapterCopy = {
  capabilitiesTitle: string
  capabilitiesLead: string
  proofTitle: string
  proofLead: string
  closeTitle: string
  closeLead: string
}

export const PILLAR_CHAPTER: Record<Pillar['slug'], PillarChapterCopy> = {
  visibility: {
    capabilitiesTitle: 'What it will do',
    capabilitiesLead: 'Be accurate in search and in the answers assistants give — without a dashboard you have to babysit.',
    proofTitle: 'Where traffic really comes from',
    proofLead: 'Sample analytics from the product: referrers, assistants and search in one honest list.',
    closeTitle: 'Want visibility on your list?',
    closeLead: 'Tell us your business and we will show you what we see today.',
  },
  experience: {
    capabilitiesTitle: 'What it will do',
    capabilitiesLead: 'The first seconds with your business should feel intentional on every device.',
    proofTitle: 'Phone-first, film-first',
    proofLead: 'Living cards and pages built to open fast and end on your brand.',
    closeTitle: 'Want the experience layer first?',
    closeLead: 'Start with a living card while the wider experience stack is on the roadmap.',
  },
  conversion: {
    capabilitiesTitle: 'What it will do',
    capabilitiesLead: 'One clear next step, one inbox, follow-up that does not depend on memory.',
    proofTitle: 'From scroll to enquiry',
    proofLead: 'A sample card with call, email and save — plus a form that lands in one place.',
    closeTitle: 'Ready to convert interest?',
    closeLead: 'The living business card is live today; the rest of this layer ships with the stack.',
  },
  intelligence: {
    capabilitiesTitle: 'What it will do',
    capabilitiesLead: 'A short read on what is working and what to fix next — not another BI tool.',
    proofTitle: 'Enquiries and pages in one view',
    proofLead: 'Inbox tags and top pages from the same analytics the founder sees internally.',
    closeTitle: 'Want a plain summary each month?',
    closeLead: 'Ask to be on the list when Intelligence opens beyond internal use.',
  },
}
