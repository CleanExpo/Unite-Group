import { noIndexPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

import { chakra, syne, jbMono } from '../fonts'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { KnowledgeView } from './KnowledgeView'

export const metadata = noIndexPageMetadata({
  path: "/founder/command-centre/knowledge",
  title: "Knowledge | Unite Group",
  description: "Private founder workspace: Knowledge.",
})
export default async function KnowledgeDeckPage() {
  const tools = await getToolCatalogue()
  return <KnowledgeView tools={tools} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
