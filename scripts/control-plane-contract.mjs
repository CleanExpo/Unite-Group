#!/usr/bin/env node
/**
 * UNI-2403 — control-plane contract audit.
 *
 * Reads every state machine and event vocabulary registered in
 * `contracts/control-plane/v1.ts` back out of its own source file and fails
 * when the source and the contract disagree. That is the whole point: the
 * contract is only a source of truth if drifting away from it breaks the build.
 *
 * What it proves (bounded to `CONTROL_PLANE_SOURCES`):
 *  1. every registered declaration still exists, with exactly its declared members;
 *  2. every member maps to a canonical run state, or to null with a stated reason;
 *  3. hand-copied declarations (`duplicateOf`) have not drifted apart;
 *  4. no lifecycle union inside the audited files is unregistered;
 *  5. the canonical transition table is internally consistent;
 *  6. the envelope ledger names only fields the source actually declares.
 *
 * Every function below is pure over its inputs so the tests can feed it
 * synthetic sources and prove the audit FIRES, not merely that it passes.
 *
 * Usage: node scripts/control-plane-contract.mjs [--root <dir>] [--json]
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AUDITED_TYPE_SUFFIXES,
  AUDIT_EXEMPTIONS,
  CONTROL_PLANE_SOURCES,
  ENVELOPE_LEDGER,
  LEGAL_TRANSITIONS,
  REGISTERED_EVENT_TYPES,
  REGISTERED_STATE_MACHINES,
  REQUIRED_ENVELOPE_FIELDS,
  RUN_EVENT_KINDS,
  RUN_STATES,
  TERMINAL_RUN_STATES,
} from '../contracts/control-plane/v1.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Strip line and block comments so a comment can never supply a member. */
export function stripComments(line) {
  return line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '')
}

/**
 * Extract the string-literal members of a top-level `export type NAME = ...`
 * union. Anchored on the executable declaration, never on prose. Returns null
 * when the type is absent; returns [] when it is present but has no literals.
 */
export function parseStringUnion(source, typeName) {
  const lines = String(source).split('\n')
  const header = new RegExp(`^export type ${typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`)
  const start = lines.findIndex((line) => header.test(line))
  if (start === -1) return null

  const members = []
  for (let i = start; i < lines.length; i += 1) {
    const raw = i === start ? lines[i].slice(lines[i].indexOf('=') + 1) : lines[i]
    const text = stripComments(raw)
    if (i > start && !text.trim().startsWith('|')) break
    for (const match of text.matchAll(/'([^']*)'/g)) members.push(match[1])
    // A single-line declaration ends at its own line.
    if (i === start && text.trim() !== '' && !text.trimEnd().endsWith('|')) {
      const next = lines[i + 1]
      if (!next || !stripComments(next).trim().startsWith('|')) break
    }
  }
  return members
}

/** Every top-level `export type` name in a source, in declaration order. */
export function listExportedTypeNames(source) {
  const names = []
  for (const line of String(source).split('\n')) {
    const match = /^export type ([A-Za-z0-9_]+)\s*=/.exec(line)
    if (match) names.push(match[1])
  }
  return names
}

export function isAuditedTypeName(name, suffixes = AUDITED_TYPE_SUFFIXES) {
  return suffixes.some((suffix) => name.endsWith(suffix))
}

/**
 * Audit the registries against source. `sources` is a Map of repo-relative path
 * to file contents; a missing entry is itself a violation.
 */
export function auditRegistry({
  sources,
  stateMachines = REGISTERED_STATE_MACHINES,
  eventTypes = REGISTERED_EVENT_TYPES,
  runStates = RUN_STATES,
  eventKinds = RUN_EVENT_KINDS,
  controlPlaneSources = CONTROL_PLANE_SOURCES,
  exemptions = AUDIT_EXEMPTIONS,
  suffixes = AUDITED_TYPE_SUFFIXES,
}) {
  const violations = []
  const seen = new Set()

  const checkDeclaration = (entry, kind) => {
    const key = `${entry.file}:${entry.typeName}`
    if (seen.has(key)) violations.push(`${key}: registered twice`)
    seen.add(key)

    const source = sources.get(entry.file)
    if (source === undefined) {
      violations.push(`${entry.file}: registered but not readable`)
      return
    }
    const actual = parseStringUnion(source, entry.typeName)
    if (actual === null) {
      violations.push(`${key}: declaration no longer exists in source`)
      return
    }
    const expected = [...entry.members]
    const missing = expected.filter((m) => !actual.includes(m))
    const added = actual.filter((m) => !expected.includes(m))
    if (missing.length) violations.push(`${key}: contract lists ${missing.join(', ')}; source does not`)
    if (added.length) violations.push(`${key}: source adds unmapped member(s) ${added.join(', ')}`)

    for (const member of expected) {
      if (!(member in entry.mapping)) {
        violations.push(`${key}: member '${member}' has no mapping`)
        continue
      }
      const target = entry.mapping[member]
      if (kind === 'state') {
        if (target === null) {
          if (!entry.offRunReasons || !entry.offRunReasons[member]) {
            violations.push(`${key}: member '${member}' maps to null with no stated reason`)
          }
        } else if (!runStates.includes(target)) {
          violations.push(`${key}: member '${member}' maps to unknown run state '${target}'`)
        }
      } else if (!eventKinds.includes(target)) {
        violations.push(`${key}: member '${member}' maps to unknown event kind '${target}'`)
      }
    }
    for (const member of Object.keys(entry.mapping)) {
      if (!expected.includes(member)) {
        violations.push(`${key}: mapping covers '${member}', which is not a declared member`)
      }
    }
  }

  for (const entry of stateMachines) checkDeclaration(entry, 'state')
  for (const entry of eventTypes) checkDeclaration(entry, 'event')

  // Hand-copied declarations must stay member-identical.
  const byId = new Map([...stateMachines, ...eventTypes].map((e) => [e.id, e]))
  for (const entry of [...stateMachines, ...eventTypes]) {
    if (!entry.duplicateOf) continue
    const other = byId.get(entry.duplicateOf)
    if (!other) {
      violations.push(`${entry.id}: duplicateOf '${entry.duplicateOf}' is not registered`)
      continue
    }
    const a = [...entry.members].sort().join(',')
    const b = [...other.members].sort().join(',')
    if (a !== b) {
      violations.push(`${entry.id} and ${other.id} are declared duplicates but have drifted apart`)
    }
  }

  // Duplicate-control-system audit: nothing lifecycle-shaped may go unregistered.
  for (const file of controlPlaneSources) {
    const source = sources.get(file)
    if (source === undefined) {
      violations.push(`${file}: listed in CONTROL_PLANE_SOURCES but not readable`)
      continue
    }
    for (const name of listExportedTypeNames(source)) {
      if (!isAuditedTypeName(name, suffixes)) continue
      const key = `${file}:${name}`
      if (seen.has(key) || key in exemptions) continue
      violations.push(`${key}: lifecycle union is neither registered nor exempt`)
    }
  }

  return { ok: violations.length === 0, violations }
}

/** The canonical transition table must be closed, and terminals must be dead ends. */
export function auditTransitions({
  transitions = LEGAL_TRANSITIONS,
  runStates = RUN_STATES,
  terminals = TERMINAL_RUN_STATES,
} = {}) {
  const violations = []
  for (const state of runStates) {
    if (!(state in transitions)) {
      violations.push(`run state '${state}' has no transition entry`)
      continue
    }
    for (const target of transitions[state]) {
      if (!runStates.includes(target)) {
        violations.push(`transition ${state} → ${target} names an unknown state`)
      }
      if (target === state) violations.push(`transition ${state} → ${state} is a self-loop`)
    }
  }
  for (const state of Object.keys(transitions)) {
    if (!runStates.includes(state)) violations.push(`transition table has unknown state '${state}'`)
  }
  for (const terminal of terminals) {
    const outgoing = transitions[terminal] ?? []
    if (outgoing.length > 0) {
      violations.push(`terminal state '${terminal}' has outgoing transitions`)
    }
  }
  const reachable = new Set(['queued'])
  let grew = true
  while (grew) {
    grew = false
    for (const state of [...reachable]) {
      for (const target of transitions[state] ?? []) {
        if (!reachable.has(target)) {
          reachable.add(target)
          grew = true
        }
      }
    }
  }
  for (const state of runStates) {
    if (!reachable.has(state)) violations.push(`run state '${state}' is unreachable from 'queued'`)
  }
  return { ok: violations.length === 0, violations }
}

/** The envelope ledger may only name fields the source interface declares. */
export function auditEnvelopeLedger({
  sources,
  ledger = ENVELOPE_LEDGER,
  requiredFields = REQUIRED_ENVELOPE_FIELDS,
}) {
  const violations = []
  for (const entry of ledger) {
    const source = sources.get(entry.file)
    if (source === undefined) {
      violations.push(`${entry.file}: envelope ledger entry is not readable`)
      continue
    }
    const body = extractInterfaceBody(source, entry.interfaceName)
    if (body === null) {
      violations.push(`${entry.file}:${entry.interfaceName}: interface no longer exists`)
      continue
    }
    const declared = new Set(
      body
        .split('\n')
        .map((line) => /^\s*([A-Za-z0-9_]+)\s*[?:]/.exec(stripComments(line)))
        .filter(Boolean)
        .map((match) => match[1]),
    )
    for (const field of requiredFields) {
      if (!(field in entry.fields)) {
        violations.push(`${entry.id}: no ledger entry for required field '${field}'`)
        continue
      }
      const claim = entry.fields[field]
      if (claim === false) continue
      if (!declared.has(claim)) {
        violations.push(
          `${entry.id}: claims '${field}' is satisfied by '${claim}', which ${entry.interfaceName} does not declare`,
        )
      }
    }
    for (const field of Object.keys(entry.fields)) {
      if (!requiredFields.includes(field)) {
        violations.push(`${entry.id}: ledger names '${field}', which is not a required envelope field`)
      }
    }
  }
  return { ok: violations.length === 0, violations }
}

/** Body of a top-level `export interface NAME {` block, or null. */
export function extractInterfaceBody(source, interfaceName) {
  const lines = String(source).split('\n')
  const header = new RegExp(`^export interface ${interfaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
  const start = lines.findIndex((line) => header.test(line))
  if (start === -1) return null
  const body = []
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^}/.test(lines[i])) return body.join('\n')
    body.push(lines[i])
  }
  return null
}

/** Read every file the audit needs, tolerating absence (absence is a violation). */
export async function loadSources(root, files) {
  const sources = new Map()
  for (const file of files) {
    try {
      sources.set(file, await readFile(join(root, file), 'utf8'))
    } catch {
      // left unset; auditRegistry reports it
    }
  }
  return sources
}

export async function runAudit(root = ROOT) {
  const files = new Set(CONTROL_PLANE_SOURCES)
  for (const entry of [...REGISTERED_STATE_MACHINES, ...REGISTERED_EVENT_TYPES, ...ENVELOPE_LEDGER]) {
    files.add(entry.file)
  }
  const sources = await loadSources(root, [...files])
  const registry = auditRegistry({ sources })
  const transitions = auditTransitions()
  const envelope = auditEnvelopeLedger({ sources })
  return {
    ok: registry.ok && transitions.ok && envelope.ok,
    registry,
    transitions,
    envelope,
    scope: [...files].sort(),
  }
}

async function main() {
  const args = process.argv.slice(2)
  const rootFlag = args.indexOf('--root')
  const root = rootFlag === -1 ? ROOT : resolve(args[rootFlag + 1])
  const result = await runAudit(root)

  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    const counts = [
      `${REGISTERED_STATE_MACHINES.length} state machines`,
      `${REGISTERED_EVENT_TYPES.length} event vocabularies`,
      `${ENVELOPE_LEDGER.length} event shapes`,
    ].join(', ')
    console.log(`control-plane contract v1 — audited ${counts} across ${result.scope.length} files`)
    for (const section of ['registry', 'transitions', 'envelope']) {
      for (const violation of result[section].violations) {
        console.error(`  ${section}: ${violation}`)
      }
    }
    console.log(result.ok ? 'PASS' : 'FAIL')
  }
  process.exitCode = result.ok ? 0 : 1
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
