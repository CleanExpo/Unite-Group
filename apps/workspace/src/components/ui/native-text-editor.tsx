import { cn } from '@/lib/utils'

type NativeTextEditorProps = {
  value: string
  onValueChange: (value: string) => void
  accessibleName: string
  readOnly?: boolean
  fontSize: number
  wordWrap: boolean
  className?: string
}

function NativeTextEditor({
  value,
  onValueChange,
  accessibleName,
  readOnly = false,
  fontSize,
  wordWrap,
  className,
}: NativeTextEditorProps) {
  return (
    <textarea
      aria-label={accessibleName}
      aria-readonly={readOnly}
      readOnly={readOnly}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      wrap={wordWrap ? 'soft' : 'off'}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      style={{ fontSize }}
      className={cn(
        'h-full w-full resize-none border-0 bg-surface px-4 py-3 font-mono leading-relaxed text-primary-900 outline-none placeholder:text-primary-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500/60 read-only:cursor-default read-only:opacity-90',
        className,
      )}
    />
  )
}

export { NativeTextEditor }
export type { NativeTextEditorProps }
