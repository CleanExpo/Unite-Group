import '@/styles/public-tokens.css'

import { publicDisplayClassName } from '@/lib/public-fonts'

import s from './public.module.css'

/** Shared root for public marketing routes: Forge Cinema tokens + display font. */
export function PublicPageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={[s.page, publicDisplayClassName, className].filter(Boolean).join(' ')}>{children}</div>
}
