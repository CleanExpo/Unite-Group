import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/auth/confirm',
  title: 'Confirming sign-in | Unite Group',
  description: 'Completing your Unite Group sign-in.',
})

export default function AuthConfirmLayout({ children }: { children: ReactNode }) {
  return children
}
