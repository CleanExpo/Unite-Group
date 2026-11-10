import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/forgot-password',
  title: 'Forgot password | Unite Group',
  description: 'Reset your Unite Group account password.',
})

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
