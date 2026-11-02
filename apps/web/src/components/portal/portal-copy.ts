// Words for the business-owner portal. One home so the pages and the tests read the same text.

/** The promise every owner sees before they connect anything. Wording set by the founder; keep it exact. */
export const NO_PASSWORD_LINE = "You never give us your password. You click Allow on Google's or Microsoft's own screen."

export type StepStatus = 'up-next' | 'not-started'

export interface PortalStep {
  id: 'intake' | 'connect' | 'audit' | 'profile' | 'reviews'
  title: string
  body: string
  status: StepStatus
}

// Static for this first release: nothing here reads live progress yet, and the page says so beside the list.
export const PORTAL_STEPS: readonly PortalStep[] = [
  {
    id: 'intake',
    title: 'Tell us about your business',
    body: 'A short set of questions about what you do, who you do it for and where you work. It shapes everything after it.',
    status: 'up-next',
  },
  {
    id: 'connect',
    title: 'Connect your accounts',
    body: 'Link your Google Business Profile and, if you use it, Microsoft. You stay the owner and can remove our access at any time.',
    status: 'not-started',
  },
  {
    id: 'audit',
    title: 'Your free audit',
    body: 'We look at how your business shows up when people search for you, then send you a plain-English list of what to fix first.',
    status: 'not-started',
  },
  {
    id: 'profile',
    title: 'Profile updates',
    body: 'We work through that list with you: hours, services, photos and links, so what people find is right.',
    status: 'not-started',
  },
  {
    id: 'reviews',
    title: 'Reviews',
    body: 'A Google review button on your card, and a ready-to-send message you can pass to a happy customer.',
    status: 'not-started',
  },
] as const

export const STATUS_LABEL: Record<StepStatus, string> = {
  'up-next': 'Up next',
  'not-started': 'Not started',
}

export const STATUS_NOTE = 'Our team sets these for now. They do not yet update on their own.'
