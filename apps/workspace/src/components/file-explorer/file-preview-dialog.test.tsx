// @vitest-environment jsdom
import React from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/dialog', () => ({
  DialogRoot: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogClose: ({ render }: { render: React.ReactNode }) => <>{render}</>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

import FilePreviewDialog from './file-preview-dialog'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  vi.restoreAllMocks()
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function renderDialog(onSaved = vi.fn()) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await React.act(async () => {
    root.render(
      <FilePreviewDialog
        path="notes/proof.md"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    )
  })
  cleanups.push(async () => {
    await React.act(async () => root.unmount())
    container.remove()
  })
  return { container, onSaved }
}

describe('FilePreviewDialog confirmed writes', () => {
  it('keeps the draft dirty and surfaces a non-2xx save instead of claiming success', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'text', content: '# Original' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'disk unavailable' }),
      } as Response)
    const { container, onSaved } = await renderDialog()

    await vi.waitFor(() =>
      expect((container.querySelector('textarea') as HTMLTextAreaElement)?.value).toBe(
        '# Original',
      ),
    )
    const editor = container.querySelector('textarea') as HTMLTextAreaElement
    await React.act(async () => {
      fireEvent.change(editor, { target: { value: '# Unsaved change' } })
    })
    const save = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Save',
    )!

    await React.act(async () => save.click())

    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'Failed to save file (500)',
      ),
    )
    expect(save.disabled).toBe(false)
    expect(editor.value).toBe('# Unsaved change')
    expect(onSaved).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/files',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'write',
          path: 'notes/proof.md',
          content: '# Unsaved change',
        }),
      }),
    )
  })
})
