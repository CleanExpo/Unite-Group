import '@/styles/public-tokens.css'

import s from './public.module.css'

/** Shared root for public marketing routes (display font variables are on `<html>` via root layout). */
export function PublicPageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={[s.page, className].filter(Boolean).join(' ')}>{children}</div>
}
