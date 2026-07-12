// @vitest-environment jsdom
import React from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@hugeicons/react', () => ({
  HugeiconsIcon: () => React.createElement('span', { 'aria-hidden': true }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean
    onCheckedChange: (next: boolean) => void
  }) =>
    React.createElement('input', {
      type: 'checkbox',
      checked,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        onCheckedChange(event.target.checked),
    }),
}))

import { MemoryEditor } from './MemoryEditor'

const cleanups: Array<() => Promise<void>> = []

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const baseProps: React.ComponentProps<typeof MemoryEditor> = {
  path: 'memory/decision.md',
  content: '# Decision',
  loading: false,
  error: null,
  readOnly: false,
  saveState: 'saved',
  lastSavedAt: null,
  editorFontSize: 14,
  editorWordWrap: true,
  onChangeContent: vi.fn(),
  onSave: vi.fn(),
  onToggleReadOnly: vi.fn(),
}

async function renderMemory(
  overrides: Partial<React.ComponentProps<typeof MemoryEditor>> = {},
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props = { ...baseProps, ...overrides }
  await React.act(async () => root.render(<MemoryEditor {...props} />))
  cleanups.push(async () => {
    await React.act(async () => root.unmount())
    container.remove()
  })
  return { container, props }
}

describe('MemoryEditor', () => {
  it('renders loading and alert states in place of the editor', async () => {
    const loading = await renderMemory({ loading: true })
    expect(loading.container.textContent).toContain('Loading file content...')
    expect(loading.container.querySelector('textarea')).toBeNull()

    const failed = await renderMemory({ error: 'Could not load memory' })
    expect(
      failed.container.querySelector('[role="alert"]')?.textContent,
    ).toContain('Could not load memory')
    expect(failed.container.querySelector('textarea')).toBeNull()
  })

  it('preserves editing, save, read-only, font, wrap, and live status contracts', async () => {
    const onChangeContent = vi.fn()
    const onSave = vi.fn()
    const onToggleReadOnly = vi.fn()
    const { container } = await renderMemory({
      saveState: 'unsaved',
      onChangeContent,
      onSave,
      onToggleReadOnly,
    })
    const textarea = container.querySelector('textarea')!
    expect(textarea.getAttribute('aria-label')).toBe('Edit memory/decision.md')
    expect(textarea.style.fontSize).toBe('14px')
    expect(textarea.wrap).toBe('soft')
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Unsaved changes',
    )

    await React.act(async () => {
      fireEvent.change(textarea, { target: { value: '# Updated' } })
    })
    expect(onChangeContent).toHaveBeenCalledWith('# Updated')

    const save = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Save'),
    )!
    await React.act(async () => save.click())
    expect(onSave).toHaveBeenCalledTimes(1)

    const toggle = container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement
    await React.act(async () => toggle.click())
    expect(onToggleReadOnly).toHaveBeenCalledWith(true)
  })

  it.each([
    { path: null, loading: false, error: null, readOnly: false },
    { path: 'memory/a.md', loading: true, error: null, readOnly: false },
    { path: 'memory/a.md', loading: false, error: 'failed', readOnly: false },
    { path: 'memory/a.md', loading: false, error: null, readOnly: true },
  ])('disables save for unavailable or read-only state %#', async (state) => {
    const { container } = await renderMemory(state)
    const save = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Save'),
    )!
    expect(save.disabled).toBe(true)
  })
})
