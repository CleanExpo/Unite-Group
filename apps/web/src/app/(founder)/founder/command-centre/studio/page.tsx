import { StudioView } from './StudioView'
import { chakra, syne, jbMono } from '../fonts'
import { noIndexPageMetadata } from '@/lib/page-metadata'


export const dynamic = 'force-dynamic'

export const metadata = noIndexPageMetadata({
  path: "/founder/command-centre/studio",
  title: "Studio | Unite Group",
  description: "Private founder workspace: Studio.",
})
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>
}) {
  const { taskId } = await searchParams
  return <StudioView taskId={taskId} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
