import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { ProvidersView } from './ProvidersView'

export const metadata = noIndexPageMetadata({
  path: "/founder/command-centre/providers",
  title: "Providers | Unite Group",
  description: "Private founder workspace: Providers.",
})
export default function ProvidersDeckPage() {
  return <ProvidersView  className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
