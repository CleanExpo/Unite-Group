import { notFound } from 'next/navigation'
import { KnowledgeConsoleClient } from '@/components/founder/knowledge-console/KnowledgeConsoleClient'

export const dynamic = 'force-dynamic'

export default function KnowledgeConsolePreviewPage() {
  if (process.env.KNOWLEDGE_CONSOLE_PREVIEW !== '1') {
    notFound()
  }

  return <KnowledgeConsoleClient />
}
