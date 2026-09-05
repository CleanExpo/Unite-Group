import { StudioView } from './StudioView'
import { chakra, syne, jbMono } from '../fonts'

export const dynamic = 'force-dynamic'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>
}) {
  const { taskId } = await searchParams
  return <StudioView taskId={taskId} className={`${chakra.variable} ${syne.variable} ${jbMono.variable}`} />
}
