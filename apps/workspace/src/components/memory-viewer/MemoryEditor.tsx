import { HugeiconsIcon } from '@hugeicons/react'
import { FloppyDiskIcon, LockIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { NativeTextEditor } from '@/components/ui/native-text-editor'

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

type MemoryEditorProps = {
  path: string | null
  content: string
  loading: boolean
  error: string | null
  readOnly: boolean
  saveState: SaveState
  lastSavedAt: string | null
  editorFontSize: number
  editorWordWrap: boolean
  onChangeContent: (value: string) => void
  onSave: () => void
  onToggleReadOnly: (next: boolean) => void
}

function getStatusLabel(
  saveState: SaveState,
  lastSavedAt: string | null,
): string {
  if (saveState === 'saving') return 'Auto-saving...'
  if (saveState === 'unsaved') return 'Unsaved changes'
  if (saveState === 'error') return 'Save failed'
  if (!lastSavedAt) return 'Saved'
  const formatted = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(lastSavedAt))
  return `Saved at ${formatted}`
}

function MemoryEditor({
  path,
  content,
  loading,
  error,
  readOnly,
  saveState,
  lastSavedAt,
  editorFontSize,
  editorWordWrap,
  onChangeContent,
  onSave,
  onToggleReadOnly,
}: MemoryEditorProps) {
  const disabled = !path || loading || Boolean(error)

  return (
    <section className="flex min-h-0 flex-1 flex-col border-primary-200 bg-primary-50/40 lg:border-r">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-200 px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-balance text-primary-900">
            {path || 'No file selected'}
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-primary-600 text-pretty tabular-nums"
          >
            {getStatusLabel(saveState, lastSavedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-xs text-primary-700 tabular-nums">
            <HugeiconsIcon icon={LockIcon} size={20} strokeWidth={1.5} />
            Read-only
            <Switch
              checked={readOnly}
              onCheckedChange={function onCheckedChange(next) {
                onToggleReadOnly(next)
              }}
            />
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled || readOnly}
            onClick={onSave}
            className="tabular-nums"
          >
            <HugeiconsIcon icon={FloppyDiskIcon} size={20} strokeWidth={1.5} />
            Save
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-primary-600 text-pretty">
            Loading file content...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex h-full items-center justify-center px-5 text-sm text-red-700 text-pretty"
          >
            {error}
          </div>
        ) : (
          <NativeTextEditor
            key={path || 'memory-none'}
            accessibleName={path ? `Edit ${path}` : 'Memory editor'}
            value={content}
            onValueChange={function onChangeEditor(nextValue) {
              onChangeContent(nextValue)
            }}
            readOnly={readOnly}
            fontSize={editorFontSize}
            wordWrap={editorWordWrap}
          />
        )}
      </div>
    </section>
  )
}

export { MemoryEditor }
