import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { scanStyles, sourceKey } from './coverage'
import { STATES, STYLE_SOURCES } from './states'

/**
 * The styling-code check. Runs after both viewports. Fails when:
 * - the page source has a state it cannot trace (Tailwind variant, unknown pseudo-class, plain .css);
 * - any state selector in the page's CSS modules was never on screen during a capture;
 * - a viewport did not capture every state in the fixed list (including pressed).
 */

const WEB_ROOT = join(__dirname, '..', '..')
const RECORD_DIR = join(WEB_ROOT, 'test-results', 'visual-records')
const PROJECTS = ['desktop', 'mobile']

test('every styled state in the page source was screenshotted', () => {
  const { styled, problems } = scanStyles(WEB_ROOT, STYLE_SOURCES)
  expect(styled.length, 'the scan found the page styles (a scan that finds nothing proves nothing)').toBeGreaterThan(0)

  const covered = new Map<string, string[]>()
  for (const project of PROJECTS) {
    const file = join(RECORD_DIR, `${project}.json`)
    expect(existsSync(file), `${project} capture record`).toBe(true)
    const data = JSON.parse(readFileSync(file, 'utf8')) as { states: string[]; record: { state: string; matched: string[] }[] }
    expect(data.record.map((r) => r.state), `${project} captured every state in the list`).toEqual(STATES.map((s) => s.id))
    for (const { state, matched } of data.record) {
      for (const compiled of matched) {
        const key = sourceKey(compiled)
        if (key) covered.set(key, [...(covered.get(key) ?? []), `${project}/${state}`])
      }
    }
  }

  const gaps = styled
    .filter((s) => !covered.has(s.key))
    .map((s) => `${s.file}:${s.line} "${s.selector}" (${s.states.join(', ')}) is styled but never screenshotted`)
  const report = [...problems.map((p) => `${p.file}:${p.line} ${p.message}`), ...gaps]
  expect(report, 'styled states without a screenshot').toEqual([])
})

test('the fixed list has the pressed state for every control that has hover', () => {
  const hovered = new Set(STATES.filter((s) => s.kind === 'hover').map((s) => s.id.replace(/-hover$/, '')))
  const pressed = new Set(STATES.filter((s) => s.kind === 'pressed').map((s) => s.id.replace(/-pressed$/, '')))
  expect([...hovered].filter((id) => !pressed.has(id)), 'hover without pressed').toEqual([])
})
