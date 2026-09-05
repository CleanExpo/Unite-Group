export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { ProvidersView } from './ProvidersView'

export default function ProvidersDeckPage() {
  return <ProvidersView  className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
