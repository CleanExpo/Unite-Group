// @vitest-environment jsdom
import React from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NativeTextEditor } from './native-text-editor'

const cleanups: Array<() => Promise<void>> = []

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function renderEditor(
  overrides: Partial<React.ComponentProps<typeof NativeTextEditor>> = {},
) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onValueChange = vi.fn()
  await React.act(async () => {
    root.render(
      <NativeTextEditor
        value="Initial draft"
        onValueChange={onValueChange}
        accessibleName="Workspace draft editor"
        fontSize={15}
        wordWrap={true}
        {...overrides}
      />,
    )
  })
  cleanups.push(async () => {
    await React.act(async () => root.unmount())
    container.remove()
  })
  return { textarea: container.querySelector('textarea')!, onValueChange }
}

describe('NativeTextEditor', () => {
  it('renders an accessible controlled multiline editor with font and wrap settings', async () => {
    const { textarea } = await renderEditor()
    expect(textarea.getAttribute('aria-label')).toBe('Workspace draft editor')
    expect(textarea.value).toBe('Initial draft')
    expect(textarea.wrap).toBe('soft')
    expect(textarea.style.fontSize).toBe('15px')
    expect(textarea.getAttribute('spellcheck')).toBe('false')
  })

  it('reports edits including an empty value', async () => {
    const { textarea, onValueChange } = await renderEditor()
    await React.act(async () => {
      fireEvent.change(textarea, { target: { value: '' } })
    })
    expect(onValueChange).toHaveBeenCalledWith('')
  })

  it('uses the native read-only and no-wrap contracts', async () => {
    const { textarea } = await renderEditor({ readOnly: true, wordWrap: false })
    expect(textarea.readOnly).toBe(true)
    expect(textarea.getAttribute('aria-readonly')).toBe('true')
    expect(textarea.wrap).toBe('off')
  })
})
