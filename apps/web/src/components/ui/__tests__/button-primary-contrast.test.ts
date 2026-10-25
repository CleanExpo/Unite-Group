import { describe, it, expect } from 'vitest'
import { buttonVariants } from '../button'

describe('Button primary variant', () => {
  it('uses the green text token, not the near-white shadcn accent, on its pale green fill', () => {
    const cls = buttonVariants({ variant: 'primary' })
    expect(cls).toContain('text-(--color-accent-text)')
    expect(cls.split(/\s+/)).not.toContain('text-accent')
    expect(cls).toContain('bg-(--color-accent-10)')
  })
})
