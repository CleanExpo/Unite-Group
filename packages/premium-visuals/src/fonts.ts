/**
 * Premium font tokens. Pairing: Fraunces (editorial display serif) + Manrope (precise humanist sans)
 * + JetBrains Mono for data. All via next/font (self-hosted, zero layout shift).
 * Repos with their own brand system (e.g. Unite-Group Scientific Luxury) may override the display face,
 * but must not fall back to system/Inter/Roboto/Arial.
 */
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google';

export const displayFont = Fraunces({ subsets: ['latin'], variable: '--pv-font-display', display: 'swap', axes: ['opsz', 'SOFT'] });
export const bodyFont = Manrope({ subsets: ['latin'], variable: '--pv-font-body', display: 'swap' });
export const monoFont = JetBrains_Mono({ subsets: ['latin'], variable: '--pv-font-mono', display: 'swap' });

/** Put on <html className={fontVariables}>. */
export const fontVariables = `${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`;

export const type = {
  display: 'font-[family-name:var(--pv-font-display)] tracking-[-0.02em] leading-[1.02]',
  h2: 'font-[family-name:var(--pv-font-display)] text-[clamp(2rem,4vw,3.5rem)] tracking-[-0.015em] leading-[1.05]',
  eyebrow: 'font-[family-name:var(--pv-font-mono)] text-[12px] uppercase tracking-[0.18em]',
  body: 'font-[family-name:var(--pv-font-body)] text-[17px] leading-[1.65]',
} as const;
