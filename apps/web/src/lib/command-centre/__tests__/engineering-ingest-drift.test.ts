import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  ENGINEERING_CATEGORIES,
  GATE_SOURCE_OF_TRUTH,
  LEGAL_STATES,
} from '@/lib/command-centre/engineering-ingest'

// engineering-ingest.ts mirrors two constants owned by engineering_gate.py — the
// ten required categories and the four legal states. Nothing imports them: the
// gate is Python, and it lives outside the repo, so it is absent from CI's
// checkout entirely.
//
// That asymmetry is the risk. If the gate gains an eleventh category, this
// module would keep accepting documents the gate now rejects, and would generate
// a plan from a review that never actually passed. The drift is silent in the
// dangerous direction.
//
// So: compare against the real gate wherever it exists (a developer machine,
// which is where drift appears first), and where it does not, still assert
// something real rather than skipping. A skipped test and a passing test look
// identical in a summary line.

function gatePath(): string {
  return path.join(
    os.homedir(),
    '.claude',
    'skills',
    'engineering-requirements',
    'scripts',
    'engineering_gate.py',
  )
}

/** Categories from the gate's `CATEGORIES = (...)` tuple. */
function parseGateCategories(source: string): string[] {
  const block = source.match(/^CATEGORIES = \(([\s\S]*?)^\)/m)
  if (!block) throw new Error('could not locate CATEGORIES in engineering_gate.py')
  return [...block[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort()
}

/** States from the gate's `LEGAL_STATES = {...}` set. */
function parseGateStates(source: string): string[] {
  const block = source.match(/^LEGAL_STATES = \{([^}]*)\}/m)
  if (!block) throw new Error('could not locate LEGAL_STATES in engineering_gate.py')
  return [...block[1].matchAll(/"([A-Z/]+)"/g)].map((m) => m[1]).sort()
}

describe('contract drift against engineering_gate.py', () => {
  it('declares where its contract comes from, so the mirror is discoverable', () => {
    // Runs everywhere, including CI. Weaker than the comparison below, but not
    // vacuous: it fails if someone drops the provenance and leaves an
    // unattributed copy of another process's contract.
    expect(GATE_SOURCE_OF_TRUTH).toMatch(/engineering_gate\.py$/)
    expect(GATE_SOURCE_OF_TRUTH).toContain('engineering-requirements')
  })

  it('mirrors the gate exactly, wherever the gate is readable', () => {
    const gate = gatePath()
    if (!existsSync(gate)) {
      // CI has no ~/.claude. Assert the fallback honestly: the constants must
      // still be internally well-formed, and the count must match the number
      // the gate is documented to require. This cannot detect a renamed
      // category — only the machine with the gate can — and that limit is
      // stated rather than hidden behind a green tick.
      expect(ENGINEERING_CATEGORIES).toHaveLength(10)
      expect(LEGAL_STATES).toHaveLength(4)
      expect(new Set(ENGINEERING_CATEGORIES).size).toBe(ENGINEERING_CATEGORIES.length)
      return
    }

    const source = readFileSync(gate, 'utf-8')
    expect([...ENGINEERING_CATEGORIES].sort()).toEqual(parseGateCategories(source))
    expect([...LEGAL_STATES].sort()).toEqual(parseGateStates(source))
  })

  it('parses a known-good gate excerpt — proving the comparison can actually fail', () => {
    // Positive control for the parser itself. If parseGateCategories silently
    // returned [] on a shape change, the comparison above would fail loudly
    // rather than pass, but only if the parser is known to work on a real
    // sample. This is that sample.
    const sample = [
      'CATEGORIES = (',
      '    "data_model",',
      '    "invariants",',
      ')',
      'LEGAL_STATES = {"DECIDED", "N/A"}',
    ].join('\n')
    expect(parseGateCategories(sample)).toEqual(['data_model', 'invariants'])
    expect(parseGateStates(sample)).toEqual(['DECIDED', 'N/A'])
  })
})
