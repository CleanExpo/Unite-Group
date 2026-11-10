import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { FounderShell } from '@/components/layout/FounderShell'
import { inter } from '@/app/(founder)/founder/command-centre/fonts'
import { FOUNDER_AREA_METADATA } from './founder-metadata'

// All founder pages require auth — render at request time only
export const dynamic = 'force-dynamic';

export const metadata = FOUNDER_AREA_METADATA

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const name = user.user_metadata?.full_name
    ?? user.email?.split('@')[0]
    ?? 'Founder'
  const email = user.email ?? ''

  return <FounderShell user={{ name, email }} missionFontClassName={inter.variable}>{children}</FounderShell>
}
