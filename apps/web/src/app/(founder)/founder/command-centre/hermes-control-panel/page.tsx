import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { getControlPanelView } from '@/lib/operator-gateway/control-panel'

import { HermesControlPanelView } from './HermesControlPanelView'

export const metadata = noIndexPageMetadata({
  path: "/founder/command-centre/hermes-control-panel",
  title: "Hermes Control Panel | Unite Group",
  description: "Private founder workspace: Hermes Control Panel.",
})
export default function HermesControlPanelPage() {
  const view = getControlPanelView()
  return <HermesControlPanelView view={view} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
