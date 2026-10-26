import { Instrument_Sans, Syne } from 'next/font/google'

/** Body UI and subheads on public pages. Must stay top-level const (next/font + Turbopack). */
const instrumentDisplay = Instrument_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-instrument-display',
  display: 'swap',
})

/** Hero and major display moments on public marketing pages. */
const syneDisplay = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne-display',
  display: 'swap',
})

export { instrumentDisplay, syneDisplay }

export const publicDisplayFontClassName = `${instrumentDisplay.variable} ${syneDisplay.variable}`
