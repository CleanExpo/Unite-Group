import { Fraunces, JetBrains_Mono, Manrope } from 'next/font/google'

/** Body and UI on public marketing pages. */
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

/** Headlines and display type on public marketing pages. */
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
})

/** Labels, eyebrows, and data on public marketing pages. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export { fraunces, jetbrainsMono, manrope }

export const publicDisplayFontClassName = `${manrope.variable} ${fraunces.variable} ${jetbrainsMono.variable}`
