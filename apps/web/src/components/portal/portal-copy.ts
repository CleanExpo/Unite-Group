// Words for the business-owner portal. One home so the pages and the tests read the same text.

/** The promise every owner sees before they connect anything. Wording set by the founder; one home, in the setup checklist. */
export { NO_PASSWORD_LINE } from '@/lib/portal/setup/items'

export type StepStatus = 'done' | 'up-next' | 'not-started'

export interface PortalStep {
  id: 'account' | 'details' | 'connections' | 'build' | 'changes' | 'launch'
  title: string
  body: string
  status: StepStatus
  /** A portal page where the owner does this step, when one exists. */
  href?: string
  linkText?: string
}

// The same pipeline for every business on the portal, in order. Static for this first release: nothing here reads
// live progress yet (the first step is done because only an owner with an open portal sees this page), and the page
// says so beside the list. Moving a domain across is its own later stage, not part of this list.
export const PORTAL_STEPS: readonly PortalStep[] = [
  {
    id: 'account',
    title: 'Your account and plan',
    body: 'Your portal is open. Your plan is shown above, and everything below happens inside it.',
    status: 'done',
  },
  {
    id: 'details',
    title: 'Your business details',
    body: 'What you do, who you do it for and where you work. It shapes the words and pictures on your new site.',
    status: 'up-next',
  },
  {
    id: 'connections',
    title: 'Connect your accounts',
    body: 'Search Console, Bing, your Google Business Profile and your socials. You stay the owner and can remove our access at any time.',
    status: 'not-started',
    href: '/portal/setup',
    linkText: 'Open the checklist',
  },
  {
    id: 'build',
    title: 'Your new website',
    body: 'We build it with photographs made for your business, never generic stock. You see a preview before anything goes live.',
    status: 'not-started',
  },
  {
    id: 'changes',
    title: 'Ask for changes',
    body: 'Tell us what to change, see each request move along, and approve the preview yourself.',
    status: 'not-started',
    href: '/portal/changes',
    linkText: 'Ask for a change',
  },
  {
    id: 'launch',
    title: 'Launch',
    body: 'When you are happy, we put the new site live. Moving your web address across is a separate step we plan with you.',
    status: 'not-started',
  },
] as const

export const STATUS_LABEL: Record<StepStatus, string> = {
  done: 'Done',
  'up-next': 'Up next',
  'not-started': 'Not started',
}

export const STATUS_NOTE = 'Our team sets these for now. They do not yet update on their own.'

export const PLAN_LABEL: Record<'comp' | 'paid' | 'none', string> = {
  comp: 'Free plan',
  paid: 'Paid plan',
  none: 'No plan yet',
}

/** /portal/verify: authenticator or emailed code, for an owner signed in with the link only. */
export const VERIFY_STEP_TITLE = 'Confirm it is you'
export const VERIFY_STEP_BODY = 'Use your authenticator app, or a 6-digit code we email you. Then we take you straight back.'
