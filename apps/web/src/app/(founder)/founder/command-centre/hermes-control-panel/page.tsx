export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { getControlPanelView } from '@/lib/operator-gateway/control-panel'

import { HermesControlPanelView } from './HermesControlPanelView'

export default function HermesControlPanelPage() {
  const view = getControlPanelView()
  return <HermesControlPanelView view={view} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
