import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/auth/reset-password',
  title: 'Reset password | Unite Group',
  description: 'Choose a new password for your Unite Group account.',
})

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
