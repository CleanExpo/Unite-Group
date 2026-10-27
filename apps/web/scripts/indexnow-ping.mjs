#!/usr/bin/env node
// IndexNow ping (UNI-3061). Reads the live sitemaps on unite-group.in and submits every
// URL to api.indexnow.org. The key is public by design (served at /<key>.txt); no secrets used.
// Usage: node scripts/indexnow-ping.mjs [--dry-run]
import { readFileSync } from 'node:fs'

const SITE = 'https://unite-group.in'
const key = /INDEXNOW_KEY = '([0-9a-f]{32})'/.exec(readFileSync(new URL('../src/lib/indexnow.ts', import.meta.url), 'utf8'))?.[1]
if (!key) throw new Error('INDEXNOW_KEY not found in src/lib/indexnow.ts')
const dry = process.argv.includes('--dry-run')

const locs = async (path) => {
  const res = await fetch(`${SITE}${path}`)
  if (!res.ok) throw new Error(`${path} returned ${res.status}`)
  return [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

const keyRes = await fetch(`${SITE}/${key}.txt`)
const served = keyRes.ok ? (await keyRes.text()).trim() : ''
if (served !== key) throw new Error(`key file not live yet (status ${keyRes.status}); not pinging`)

const urlList = [...new Set([...(await locs('/sitemap.xml')), ...(await locs('/video-sitemap.xml'))])].filter((u) => u.startsWith(`${SITE}/`) || u === SITE)
const body = { host: 'unite-group.in', key, keyLocation: `${SITE}/${key}.txt`, urlList }
console.log(`IndexNow: ${urlList.length} URLs${dry ? ' (dry run)' : ''}`)
if (dry) process.exit(0)
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})
console.log(`IndexNow response: ${res.status}`)
if (res.status !== 200 && res.status !== 202) process.exit(1)
