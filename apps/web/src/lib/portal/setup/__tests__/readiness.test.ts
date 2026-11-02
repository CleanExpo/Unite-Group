import { describe, expect, it } from 'vitest'

import { CHECKLIST } from '../items'
import { computeReadiness, itemDone } from '../readiness'

describe('setup readiness', () => {
  it('nothing saved: 0%, next step is the first item, save its link', () => {
    expect(computeReadiness([])).toEqual({ percent: 0, done: 0, total: 9, next: { kind: 'gsc', action: 'save_link' } })
  })

  it('GSC with only a link saved is not done: next step is to add our account', () => {
    const r = computeReadiness([{ kind: 'gsc', status: 'link_saved' }])
    expect(r.done).toBe(0)
    expect(r.next).toEqual({ kind: 'gsc', action: 'grant_access' })
  })

  it('a social with a saved link is done', () => {
    expect(itemDone('facebook', 'link_saved')).toBe(true)
    expect(itemDone('facebook', 'not_started')).toBe(false)
    expect(itemDone('gbp', 'link_saved')).toBe(false)
    expect(itemDone('gbp', 'access_granted')).toBe(true)
    expect(itemDone('gbp', 'verified')).toBe(true)
  })

  it('counts and rounds down, and moves to the next unfinished item in checklist order', () => {
    const r = computeReadiness([
      { kind: 'gsc', status: 'verified' },
      { kind: 'bing', status: 'access_granted' },
      { kind: 'facebook', status: 'link_saved' },
    ])
    expect(r).toEqual({ percent: 33, done: 3, total: 9, next: { kind: 'gbp', action: 'save_link' } })
  })

  it('all done: 100% and no next step', () => {
    const all = CHECKLIST.map((i) => ({ kind: i.kind, status: 'verified' }))
    expect(computeReadiness(all)).toEqual({ percent: 100, done: 9, total: 9, next: null })
  })

  it('unknown kinds and statuses count as nothing (fail closed)', () => {
    const r = computeReadiness([{ kind: 'myspace', status: 'verified' }, { kind: 'gsc', status: 'done' }])
    expect(r.done).toBe(0)
    expect(r.next).toEqual({ kind: 'gsc', action: 'save_link' })
  })

  it('is presence-only: it never reads a value, so an input without one gives the same answer', () => {
    const withValue = [{ kind: 'x', status: 'link_saved', value: 'https://x.com/brii' }]
    expect(computeReadiness(withValue)).toEqual(computeReadiness([{ kind: 'x', status: 'link_saved' }]))
  })
})
