'use client'

import { Eye, EyeOff } from 'lucide-react'

/** Password input with a show/hide eye toggle. Shared across the Vault screens. */
export function PasswordField(props: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  show: boolean
  onToggle: () => void
  error?: boolean
  autoFocus?: boolean
  /** Input background — defaults to the card surface. */
  bg?: string
}) {
  return (
    <div className="relative">
      <input
        type={props.show ? 'text' : 'password'}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        className="w-full px-3 pr-9 h-9 rounded-sm text-[13px] text-[#0A0A0A] outline-hidden transition-colors"
        style={{
          background: props.bg ?? 'var(--surface-card)',
          border: `1px solid ${props.error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        }}
      />
      <button
        type="button"
        onClick={props.onToggle}
        tabIndex={-1}
        aria-label={props.show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors hover:opacity-80"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {props.show ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
      </button>
    </div>
  )
}
