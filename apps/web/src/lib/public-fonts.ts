import { Instrument_Sans, Syne } from 'next/font/google'

/** Body UI and subheads on public pages. */
export const instrumentDisplay = Instrument_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-instrument-display',
  display: 'swap',
})

/** Hero and major display moments — distinctive, not generic SaaS. */
export const syneDisplay = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne-display',
  display: 'swap',
})

export const publicDisplayClassName = `${instrumentDisplay.variable} ${syneDisplay.variable}`
