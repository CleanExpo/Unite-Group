// public/llms.txt is served unauthenticated (EXACT_PUBLIC_FILES in src/proxy.ts), so
// everything it says is a public claim. unite-group.com.au does not resolve
// (NXDOMAIN, 14/10/2026); pointing AI engines at it damages the entity signal.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { isPublicPath } from '../proxy'

const llms = readFileSync(path.resolve(__dirname, '../../public/llms.txt'), 'utf8')

describe('public/llms.txt', () => {
  it('is reachable without a session', () => {
    expect(isPublicPath('/llms.txt')).toBe(true)
  })

  it('names the live domain and never the dead unite-group.com.au', () => {
    expect(llms).toContain('https://unite-group.in')
    expect(llms).not.toMatch(/unite-group\.com\.au/)
  })
})
