export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { KnowledgeView } from './KnowledgeView'

export default async function KnowledgeDeckPage() {
  const tools = await getToolCatalogue()
  return <KnowledgeView tools={tools} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
