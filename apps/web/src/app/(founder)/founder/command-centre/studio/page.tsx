import { StudioClient } from './StudioClient'

export const dynamic = 'force-dynamic'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>
}) {
  const { taskId } = await searchParams
  if (!taskId) {
    return (
      <div className="p-6 text-sm text-neutral-400">
        Open the studio from a routed idea — a <code>taskId</code> is required.
      </div>
    )
  }
  return <StudioClient taskId={taskId} />
}
