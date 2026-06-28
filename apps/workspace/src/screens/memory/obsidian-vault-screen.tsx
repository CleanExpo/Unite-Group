import { HugeiconsIcon } from '@hugeicons/react'
import { BrainIcon, FolderLibraryIcon } from '@hugeicons/core-free-icons'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

/**
 * 2nd Brain — surfaces the Obsidian vault status from the existing
 * `/api/mission-control-os` endpoint (server: `mission-control-os.ts`).
 * Read-only metadata only: connection state, folder + markdown counts, the
 * imported mirror, and the canonical read-first note. No vault contents are
 * fetched and nothing is written.
 */

type ObsidianStatus = {
  status: 'connected' | 'missing'
  path: string
  readFirst: string
  markdownFiles: number
  folders: Array<string>
  mirror: {
    status: 'connected' | 'missing'
    path: string
    markdownFiles: number
  }
}

type MissionControlOsResponse = {
  ok?: boolean
  obsidian?: ObsidianStatus
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        connected
          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
          : 'bg-red-500',
      )}
      aria-hidden
    />
  )
}

export function ObsidianVaultScreen() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mission-control-os'],
    queryFn: () =>
      readJson<MissionControlOsResponse>('/api/mission-control-os'),
  })

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-sm text-primary-500 dark:text-neutral-400">
        Scanning 2nd Brain vault...
      </div>
    )
  }

  if (isError || !data?.obsidian) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-red-500">
        <span>Could not read the 2nd Brain vault status.</span>
        {error instanceof Error ? (
          <span className="text-primary-500 dark:text-neutral-400">
            {error.message}
          </span>
        ) : null}
      </div>
    )
  }

  const { obsidian } = data
  const connected = obsidian.status === 'connected'

  return (
    <div className="h-full min-h-0 overflow-y-auto px-3 py-4 md:px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {/* Header + connection dot */}
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={BrainIcon}
            className="h-5 w-5 text-primary-500 dark:text-neutral-400"
          />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-700 dark:text-neutral-200">
            2nd Brain — Obsidian
          </h2>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-primary-500 dark:text-neutral-400">
            <StatusDot connected={connected} />
            {connected ? 'Connected' : 'Vault not found'}
          </span>
        </div>

        {/* Vault summary card */}
        <div className="rounded-lg border border-primary-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-primary-400 dark:text-neutral-500">
                Markdown notes
              </dt>
              <dd className="mt-0.5 text-lg font-semibold text-primary-800 dark:text-neutral-100">
                {obsidian.markdownFiles}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-primary-400 dark:text-neutral-500">
                Top folders
              </dt>
              <dd className="mt-0.5 text-lg font-semibold text-primary-800 dark:text-neutral-100">
                {obsidian.folders.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-primary-400 dark:text-neutral-500">
                Mirror
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-primary-700 dark:text-neutral-200">
                <StatusDot connected={obsidian.mirror.status === 'connected'} />
                {obsidian.mirror.status === 'connected'
                  ? `${obsidian.mirror.markdownFiles} notes`
                  : 'not found'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 space-y-1 border-t border-primary-100 pt-3 text-xs dark:border-neutral-800">
            <p className="text-primary-500 dark:text-neutral-400">
              Vault path:{' '}
              <code className="text-primary-700 dark:text-neutral-200">
                {obsidian.path}
              </code>
            </p>
            <p className="text-primary-500 dark:text-neutral-400">
              Read first:{' '}
              <code className="text-primary-700 dark:text-neutral-200">
                {obsidian.readFirst}
              </code>
            </p>
          </div>
        </div>

        {/* Folder chips */}
        {obsidian.folders.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-primary-400 dark:text-neutral-500">
              <HugeiconsIcon icon={FolderLibraryIcon} className="h-4 w-4" />
              Folders
            </div>
            <div className="flex flex-wrap gap-1.5">
              {obsidian.folders.map((folder) => (
                <span
                  key={folder}
                  className="rounded-md border border-primary-200 px-2 py-0.5 text-xs text-primary-700 dark:border-neutral-800 dark:text-neutral-300"
                >
                  {folder}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
