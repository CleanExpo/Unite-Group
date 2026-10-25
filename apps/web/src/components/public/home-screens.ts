import type { Pillar } from '@/lib/public-site'

// The real product screens on the home's "Four jobs" and "How it works" cards, named in ONE place.
// Phill, 25/10/2026: pictures must show the REAL product or the real job, with demo data; abstract art is rejected.
// Each file is a 2x capture of a real Unite-Group screen from local next dev, with obviously sample names
// (Sam Sample, Sample Client Pty Ltd, Alex Example, @example.com). Nothing came from production.
// cssWidth is the CSS width the screen was captured at; the frame never shows it wider, so text is never enlarged.
// frame: 'phone' for screens a customer sees, 'browser' for the founder's own screens.

export type Screen = { src: string; width: number; height: number; cssWidth: number; frame: 'phone' | 'browser'; alt: string }

const screen = (name: string, size: number, cssWidth: number, frame: Screen['frame'], alt: string): Screen => ({
  src: `/home/screens/${name}.webp`,
  width: size,
  height: size,
  cssWidth,
  frame,
  alt,
})

export type StepScreen = 'pick' | 'send' | 'approve'

export const STEP_SCREENS: Record<StepScreen, Screen> = {
  pick: screen('step-pick-editions', 720, 360, 'phone', 'The /cards showroom screen on a phone: the Blueprint and Forge openers, each ending on the logo, with Choose this beside each name'),
  send: screen('step-send-details', 720, 360, 'phone', 'The order details screen on a phone, filled in for Sam Sample of Sample Client Pty Ltd, with an email and a logo file attached'),
  approve: screen('step-approve-card', 720, 360, 'phone', 'A sample living card screen for Sam Sample, Owner, Sample Client Pty Ltd in Brisbane, with Call, Email and Save contact buttons'),
}

export const JOB_SCREENS: Record<Pillar['slug'], Screen> = {
  visibility: screen('job-visibility-referrers', 672, 336, 'browser', 'The site analytics screen listing top referrers with sample counts: google.com, chatgpt.com, bing.com, perplexity.ai and linkedin.com'),
  experience: screen('job-experience-reveal', 640, 320, 'phone', 'The /cards screen on a phone playing the Signature reveal opener, which ends on the logo'),
  conversion: screen('job-conversion-enquiry', 640, 320, 'phone', 'The enquiry form on a sample living card screen, filled in by Alex Example asking for a bathroom refit quote'),
  intelligence: screen('job-intelligence-inbox', 640, 320, 'browser', 'The Nexus inbox screen with a card enquiry from Sam Sample and a website lead from Alex Example, each dated and sourced'),
}
