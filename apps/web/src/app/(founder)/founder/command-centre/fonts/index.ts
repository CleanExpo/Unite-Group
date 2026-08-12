// src/app/(founder)/founder/command-centre/fonts/index.ts
//
// Command Centre typography, self-hosted. Previously each deck called
// next/font/google directly, which made `next build` fetch the woff2 files
// from fonts.gstatic.com at compile time — an offline or egress-filtered
// build failed outright (NextFontError: Failed to fetch `JetBrains Mono`).
// The latin-subset files now live beside this module, so the build has no
// network dependency. Same three CSS variables, same weights, same swap
// behaviour as before; only the loader changed.
//
// Refreshing the files: see ./README.md.

import localFont from 'next/font/local'

export const chakra = localFont({
  src: [
    { path: './chakra-petch-400.woff2', weight: '400', style: 'normal' },
    { path: './chakra-petch-500.woff2', weight: '500', style: 'normal' },
    { path: './chakra-petch-600.woff2', weight: '600', style: 'normal' },
    { path: './chakra-petch-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-chakra',
  display: 'swap',
})

// UNI-2339 slice 1 — canvas register typography (Syne display + JetBrains
// Mono data/KPIs), scoped to the command-centre routes via CSS variables
// consumed only by shell.module.css. Both ship as variable fonts, so one
// file covers the whole weight range each deck was requesting.
export const syne = localFont({
  src: './syne-variable.woff2',
  weight: '400 800',
  style: 'normal',
  variable: '--font-syne',
  display: 'swap',
})

export const jbMono = localFont({
  src: './jetbrains-mono-variable.woff2',
  weight: '400 600',
  style: 'normal',
  variable: '--font-jbmono',
  display: 'swap',
  // next/font/local size-adjusts against Arial by default; for the KPI/data
  // register that fallback must stay monospaced.
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
})
