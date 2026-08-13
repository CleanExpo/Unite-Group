// SCOPED stale-read sweep — the fixture-driven half of the No-Invaders census.
//
// Extracted from components/founder/__tests__/no-invaders-render-under-failure.test.tsx
// because that file's other three sweeps police the ENTIRE candidate population:
// every client component that fetches must announce failure, must not silently
// grow the retain-and-mutate risk class, and must give every error slot a path
// back to clear. Those can only pass once every surface in the app is compliant,
// which is exactly why the original audit branch was 97 files and could only ever
// be sampled by a 15-minute review.
//
// This half is fixture-driven, so it can police EXACTLY the surfaces a slice
// ships and grow with each slice. The full census lands in the final slice, at
// which point this file is deleted rather than left to drift alongside it.
//
// STALE_FIXTURES here is trimmed to the surfaces in THIS slice. A surface added
// to the slice without a fixture is the failure mode this guards against, so the
// list and the shipped files must move together.

// src/components/founder/__tests__/no-invaders-render-under-failure.test.tsx
//
// The control the 10/08/2026 census asked for, and the reason it asked.
//
// The lint ratchet (eslint.config.cjs, No-Invaders selectors) catches swallow
// SHAPES — `catch {}`, `.catch(() => [])`, discarded `error`. It cannot catch
// an ABSENCE: DecisionLog and DispatchPanel had NO catch clause at all, and
// NotificationBell's `if (!res.ok) return` is a valid early return. All three
// rendered a failed read as a calm empty state, and no selector could see it.
//
// This test provokes the failure instead of pattern-matching the source: it
// discovers founder client components that fetch, mounts each with `fetch`
// rejecting, and asserts the component says SOMETHING went wrong.
//
// It DISCOVERS rather than enumerates. The file it replaces
// (no-invaders-empty-vs-error.test.ts) was a string-matching allowlist of three
// named components — it had no denominator and could never detect a regression
// in a file nobody remembered to add.
//
// HONEST LIMITS, stated so nobody reads a green run as more than it is:
//   - Components needing props to mount are reported as UNMOUNTABLE, not
//     silently skipped. A silent skip is how a control quietly stops covering
//     things (see `control-scope`).
//   - Components that issue no read while mounting are reported as
//     NO-READ-ON-MOUNT and excluded: with no read, there is no failed read to
//     announce. The cost is that a component whose mount-read is CONDITIONAL
//     (behind a prop or a flag that is false under test) is excluded here while
//     still able to swallow in production. Those need a per-component test.
//   - It proves a failure is ANNOUNCED. It does not prove the wording is good,
//     nor that the empty state is correct when the fetch genuinely returns zero
//     rows. Those still need per-component tests.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, fireEvent, render, waitFor, cleanup } from '@testing-library/react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import React from 'react'

const ROOT = path.resolve(__dirname, '../../..') // -> src/
const SEARCH_DIRS = ['components/founder', 'components/command-centre', 'app/(founder)']

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(p, out)
    } else if (name.endsWith('.tsx') && !name.includes('.test.')) {
      out.push(p)
    }
  }
  return out
}

/** Client components that fetch — the population this control is responsible for. */
function candidates(): string[] {
  const files: string[] = []
  for (const d of SEARCH_DIRS) walk(path.join(ROOT, d), files)
  return files.filter((f) => {
    const src = readFileSync(f, 'utf8')
    return /^['"]use client['"]/m.test(src) && /\bfetch\s*\(/.test(src)
  })
}

/**
 * A component announces failure iff it renders a semantic alert.
 *
 * The first version also accepted an English word list (unavailable|failed|
 * error|...). That produced a FALSE POSITIVE on DispatchPanel, which correctly
 * rendered its error — the raw message happened to be "network down", which
 * contains none of those words. The negative control missed it because the
 * fixture was written in the same vocabulary as the matcher: a control tested
 * only against cases its author thought of.
 *
 * role="alert" is the right oracle: language-independent, not defeatable by
 * phrasing, and the same signal assistive tech consumes. A component that
 * surfaces an error the founder can see but a screen reader cannot is a defect
 * in its own right, so this is a stricter bar on purpose.
 */
function announcesFailure(html: string): boolean {
  return /role="alert"/i.test(html)
}

/**
 * Facts a component can only state if its read SUCCEEDED. Rendering any of
 * these next to a failure alert is worse than staying silent: the founder is
 * given a specific, false number rather than an absence.
 *
 * "0 team members", "0 registered · 0 usable", "No decisions yet".
 */
/**
 * The text a component renders OUTSIDE its failure alert.
 *
 * Two structural decisions, both of which the raw-HTML regex got wrong:
 *
 * 1. The alert is removed first. Its whole job is to say a read failed, and it
 *    routinely contains the very words a fabricated fact uses ("No API key
 *    found", "could not load"). Matching against raw HTML made the alert
 *    incriminate itself, which forced the pattern to stay narrow enough to be
 *    useless.
 * 2. Tags collapse to spaces before matching, so a count split across elements
 *    — `<span>0</span><span>tasks</span>` — reads as "0 tasks". The previous
 *    regex ran on raw HTML and could not see through the markup between them.
 */
function residualText(html: string): string {
  const host = document.createElement('div')
  host.innerHTML = html
  for (const alert of Array.from(host.querySelectorAll('[role="alert"]'))) alert.remove()
  // Inert, labelled seed/placeholder subtrees are stripped for the same reason
  // alerts are: they are not claims about a read. This replaces a file-wide
  // waiver that round 6 correctly called a hole — it hid three real sidebar
  // totals in HermesControlPanel. A component must OPT IN per subtree by
  // marking it data-seed-plan, and everything outside that marker is policed.
  for (const seed of Array.from(host.querySelectorAll('[data-seed-plan="true"]'))) seed.remove()

  // Text nodes are joined with a SPACE rather than read via textContent, which
  // concatenates adjacent elements with no separator: "…queue item." followed
  // by a "No auto-run" badge came out as "itemNo auto-runBuild", where word
  // boundaries silently fail. That defeated both the exemption list below and
  // the split-count detection this rewrite exists to provide — a guard whose
  // own normalisation could not see what it claimed to match.
  const parts: string[] = []
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue ?? '')
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Text that is NOT a claim about fetched data.
 *
 * The admission criterion is strict and testable: a string belongs here only if
 * it renders IDENTICALLY whether or not any read succeeded. Selection state and
 * static policy badges qualify; anything describing the contents of a data set
 * does not. That is a structural distinction, not the broad `(?!...selected)`
 * lookahead the reviewer rightly called a loophole — this list is explicit,
 * short, and auditable, and it cannot swallow "No transactions matching
 * filters" or "No open work".
 *
 * Keep it minimal. Every addition narrows the guard, so each one needs to meet
 * the criterion above on its own.
 */
const NOT_A_DATA_CLAIM: RegExp[] = [
  /\bno\s+\S+\s+selected\b/gi, // "No receipt selected yet" — user selection
  /\bno selected\s+\S+/gi, // "No selected run" — same, other word order
  /\bno auto-run\b/gi, // static safety badge on the Pi intake card
]

function stripNonClaims(text: string): string {
  return NOT_A_DATA_CLAIM.reduce((acc, re) => acc.replace(re, ' '), text)
}

/**
 * A claim about the CONTENT of a data set. Any of these, rendered outside the
 * alert after a failed read, tells the founder something the component never
 * read: a count, or an assertion that the set is empty.
 *
 * Round 6 proved the previous shape missed "Tasks: 0", "0/7 tasks", "zero
 * tasks", "There aren't any tasks", "No-data" and "All caught up". Each of
 * those is now covered and pinned by a red fixture.
 *
 * Deliberately NOT included:
 *   - an em-dash or similar placeholder. "—" asserts nothing; it is the correct
 *     degraded rendering and is what several components here now use. Treating
 *     it as fabrication would fail the honest fix.
 *   - a bare POSITIVE count ("7 tasks"). Round 6 listed it as a miss and it is
 *     one — but it is only reachable through STALE data after a LATER read
 *     fails, which is a separate finding with its own fix. Matching `\d+ [a-z]`
 *     here would fire on every timestamp, duration and "3 min ago" in the
 *     estate and turn the census into noise.
 */
const FABRICATED_FACT = new RegExp(
  [
    String.raw`\b0\s+[a-z]`, //                          "0 tasks"
    String.raw`\b[a-z][a-z ]{0,20}:\s*0\b`, //           "Tasks: 0" (label before value)
    String.raw`\b\d+\s*/\s*\d+\s+[a-z]`, //              "0/7 tasks" (fractional)
    String.raw`\bzero\s+[a-z]`, //                       "zero tasks" (word number)
    String.raw`\bno\s+[a-z]`, //                         "No decisions yet"
    String.raw`\bno-\w+`, //                             "No-data" (hyphenated)
    String.raw`\bnone\b|\bnothing\b|\bempty\b`,
    String.raw`\bthere\s+(?:are|is|aren'?t|isn'?t)\s+(?:no|any)\b`,
    String.raw`\ball\s+caught\s+up\b`, //                 euphemistic empty state
    String.raw`\bnothing\s+to\s+(?:show|do|see)\b`,
  ].join('|'),
  'i',
)

function statesFabricatedFact(html: string): boolean {
  return FABRICATED_FACT.test(stripNonClaims(residualText(html)))
}

/**
 * The scan's verdict for a component that DID issue a read, extracted so the
 * decision itself can be asserted rather than only exercised.
 *
 * Empty markup counts as silent. The predicate used to require
 * `html.trim().length > 0`, so a component that caught the rejected fetch and
 * rendered nothing was counted as policed and then waved through — the calmest
 * possible empty state, and precisely what this census exists to catch. Found
 * by independent review 11/08/2026; nothing in the population was falling
 * through it at the time, so closing it cost no remediation.
 *
 * An alert is NECESSARY but not SUFFICIENT. Round 4 of that review demonstrated
 * four components that rendered role="alert" AND a fabricated zero beside it —
 * "0 team members" under a failed read — and this census passed all of them,
 * because it asked only whether an alert existed. A component that announces
 * failure and then states a false fact anyway has not announced the failure in
 * any way the founder can act on.
 */
function isSilentAfterRead(html: string | null): boolean {
  const markup = html ?? ''
  if (!announcesFailure(markup)) return true
  return statesFabricatedFact(markup)
}

const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/')

/**
 * Both scanning tests mount the whole population and wait for each component to
 * settle, so their cost grows with the codebase. Vitest's 30s per-test default
 * is comfortable when this file runs alone and NOT comfortable inside a full
 * run competing for CPU — and the failure mode there is a timeout, which looks
 * exactly like a real finding while telling you nothing.
 */


// ─────────────────────────────────────────────────────────────────────────────
// SECOND DIMENSION: SUCCESS, THEN FAILURE.
//
// Everything above provokes an INITIAL rejected fetch. That is only half of
// what production does. The other half — a read SUCCEEDS, and a later poll,
// Refresh click or filter change FAILS — was entirely uncovered, and it is the
// worse half: the surface keeps the previous payload and renders confident,
// actionable, WRONG data next to an error the founder has no reason to read as
// "and everything below is a photograph".
//
// Retaining the payload is NOT the defect and this sweep does not ask anyone to
// blank a dashboard on one flaky poll — NotificationBell deliberately keeps its
// notifications and surfaces the failure alongside. The defect is presenting
// retained data as CURRENT and ACTIONABLE. So the property asserted here is the
// two-sided contract documented in components/ui/StaleReadNotice.tsx:
//
//   VISIBLE — a `data-stale-read="true"` region plus a notice, so the founder
//             can tell last-known data from current data.
//   INERT   — nothing inside that region that ACTS on the retained records is
//             still clickable.
//
// Why this lives in the census rather than only in six component tests: an
// initial-failure-only census cannot see a seventh surface, and six isolated
// tests cannot either. The two ratchets are what generalise.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The DOM half of the contract, extracted so the predicate itself can be
 * asserted against fixtures rather than only exercised against components.
 *
 * NOT limited to `button` — that limit was the defect UNI-2502. See the two-rule
 * design below: verb-named controls AND record-selection inputs. What remains
 * excluded, and why:
 *   - `<a href>` is excluded. HermesKanbanStatus keeps a "View in Linear" link
 *     live on a stale card on purpose — it navigates to the source of truth,
 *     which is the REMEDY for staleness, not an act on stale data.
 *   - `<select>` is excluded. Its textContent is the concatenation of every
 *     option, producing matches with nothing to do with an action ("Reconciled"
 *     inside a status filter), and a dropdown changes a VIEW or feeds a form
 *     whose submit is separately guarded. Including it flagged five false
 *     positives in one sweep. Filters and pagination are also recovery paths:
 *     disabling them would trap the surface in its degraded state.
 * The exclusions are stated so a green run is not read as more than it is.
 *
 * This comment said "deliberately limited to `button`" and listed `<input>` as
 * excluded, standing directly above code that scans checkboxes. It survived the
 * widening it was contradicting, and survived an adversarial review pass that
 * caught three other stale comments in this file but not this one.
 */
// `propose` was absent, and its absence was invisible: KanbanBoard's Propose
// button sits inside a marked stale region and POSTs /api/kanban/generate-next
// from the retained cards, yet `liveActionsInStaleRegion` returned clean for it.
// The region had to be marked before the gap could even be seen. Same shape as
// UNI-2488 — an instrument that looks stable because it cannot see what it is
// missing. Any verb added here needs the positive control below. [UNI-2495]
const MUTATION_CONTROL =
  /\b(approve|reject|defer|reconcile|route|start|block|unblock|complete|pause|resume|fail|delete|publish|send|propose)\b/i

function controlName(el: Element): string {
  return (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Controls inside a stale region that still act on the retained data.
 *
 * TWO rules, because two different kinds of control act on records and only one
 * of them announces itself with a verb.
 *
 * This scanned `region.querySelectorAll('button')` and gated every hit on
 * MUTATION_CONTROL. Both halves were holes. `ReconciliationTab` keeps its bulk
 * Approve button correctly disabled while stale but leaves every row checkbox
 * live, so a founder can build a selection over rows the latest read could not
 * confirm and carry it into a later bulk approval. The fixture for that surface
 * did not merely miss it — it PASSED, printing "marks a retained payload and
 * takes its actions offline". Reported by the round at 456ca071. [UNI-2502]
 *
 * Widening the element query alone would have fixed nothing: a selection
 * checkbox has no verb in its accessible name, and usually no accessible name
 * at all, so the MUTATION_CONTROL gate would have skipped it a second time.
 *
 *   VERB controls   — buttons and button-ish things. Unchanged: the name must
 *                     match MUTATION_CONTROL, so Refresh and Show all stay
 *                     clear and a surface is not forced to trap itself.
 *   RECORD SELECTION — checkbox and radio. These pick RECORDS out of the
 *                     retained list, the selection survives into a later bulk
 *                     action, and they carry no verb to match, so no name gate
 *                     applies. Enabled inside a marked region is the finding.
 *
 * `<select>` is deliberately NOT in the second rule, and that is a correction
 * rather than an omission. The first version included it and the sweep flagged
 * eight controls across three surfaces, of which five were false: a business
 * filter on InvoicesClient, and the provider and key-source pickers on
 * ProviderAccountsTile whose Save button is already disabled while stale. A
 * dropdown changes a VIEW, or feeds a form whose submit is separately guarded;
 * it does not act on a record. Forcing a filter inert would strand the founder
 * in a degraded view with no way to look around — the trap StaleReadNotice
 * explicitly warns against, and the reason recovery controls stay live.
 *
 * Checkbox and radio are different in kind: the selection IS the act, it
 * persists across a recovery, and ReconciliationTab carries it straight into a
 * bulk approval. That distinction is what the sweep measured, not an opinion
 * about dropdowns.
 */
const VERB_CONTROL = 'button, [role="button"], input[type="submit"], input[type="button"]'
const SELECTION_CONTROL = 'input[type="checkbox"], input[type="radio"]'

function isDisabled(el: Element): boolean {
  const native = (el as Partial<HTMLInputElement>).disabled
  if (typeof native === 'boolean') return native
  return el.getAttribute('aria-disabled') === 'true'
}

/** Accessible name, or a shape descriptor — an unnamed checkbox is still a finding. */
function describeControl(el: Element): string {
  const name = controlName(el)
  if (name) return name
  const type = el.getAttribute('type')
  return type ? `<${el.tagName.toLowerCase()} type="${type}">` : `<${el.tagName.toLowerCase()}>`
}

function liveActionsInStaleRegion(root: ParentNode): string[] {
  const live: string[] = []
  for (const region of Array.from(root.querySelectorAll('[data-stale-read="true"]'))) {
    for (const el of Array.from(region.querySelectorAll(VERB_CONTROL))) {
      const name = controlName(el)
      if (!MUTATION_CONTROL.test(name)) continue
      if (isDisabled(el)) continue
      live.push(name)
    }
    for (const el of Array.from(region.querySelectorAll(SELECTION_CONTROL))) {
      if (isDisabled(el)) continue
      live.push(describeControl(el))
    }
  }
  return live
}

interface RefreshContext {
  container: HTMLElement
  /** Poll callbacks the component registered, captured rather than scheduled. */
  polls: Array<() => void>
}

interface StaleFixture {
  /** Path relative to src/. Must be in the census candidate population. */
  file: string
  exportName: string
  /** Body returned by a read that SUCCEEDS. */
  ok: unknown
  /** A fact only a successful read can produce. It must survive, marked. */
  retained: RegExp
  /** Provoke a SECOND read. */
  refresh: (ctx: RefreshContext) => Promise<void>
  /** Accessible names of controls that ACT on the retained records. */
  actions: RegExp[]
}

/** Fire every captured poll callback once. */
async function tick({ polls }: RefreshContext): Promise<void> {
  // A refresh that never happened would leave the surface exactly as the
  // successful load left it, and every assertion after it would pass for the
  // wrong reason. This is the positive control for the trigger itself.
  expect(polls.length, 'the component registered no poll to fire').toBeGreaterThan(0)
  await act(async () => {
    for (const poll of [...polls]) poll()
  })
}

async function clickByName(container: HTMLElement, name: RegExp): Promise<void> {
  const button = Array.from(container.querySelectorAll('button')).find((el) =>
    name.test(controlName(el)),
  )
  expect(button, `no control matching ${name} to drive a refresh`).toBeTruthy()
  await act(async () => {
    fireEvent.click(button as HTMLButtonElement)
  })
}

function findControl(container: HTMLElement, name: RegExp): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((el) => name.test(controlName(el)))
}

const STALE_FIXTURES: StaleFixture[] = [
  {
    file: 'components/command-centre/live-agent-operations/LiveAgentOperationsMap.tsx',
    exportName: 'LiveAgentOperationsMap',
    ok: {
      source: 'cc:operations',
      generatedAt: '2026-08-12T00:00:00.000Z',
      summary: {
        agents: 2,
        activeSessions: 3,
        openTasks: 7,
        blockedTasks: 1,
        approvalRequired: 2,
        recentShips: 4,
      },
      nodes: [
        {
          id: 'node-1',
          label: 'Sentinel node',
          state: 'working',
          activeSessions: 3,
          openTasks: 7,
          blockedTasks: 1,
          surfaces: ['claude-code'],
          currentTasks: ['Retained operations task'],
          lastUpdatedAt: '2026-08-12T00:00:00.000Z',
        },
      ],
      workQueue: [],
      shipFeed: [],
      nextAction: 'Retained next action',
    },
    retained: /Sentinel node/,
    refresh: tick,
    actions: [],
  },
  {
    file: 'components/command-centre/work-packets/WorkPacketLane.tsx',
    exportName: 'WorkPacketLane',
    ok: {
      packets: [
        {
          id: 'wp-stale-1',
          status: 'awaiting_approval',
          outcome: 'Retained packet outcome',
          projectKey: 'synthex',
          clientId: null,
          lane: 'ops',
          riskLevel: 'low',
          nextActionOwner: 'phill',
          approvalRequired: true,
          approvedBy: null,
          labels: [],
          linearIssueId: null,
          evidencePath: null,
          createdAt: '2026-08-12T00:00:00.000Z',
        },
      ],
    },
    retained: /Retained packet outcome/,
    refresh: tick,
    actions: [/^Approve$/i],
  },
    {
    file: 'app/(founder)/founder/command-centre/QueueBoard.tsx',
    exportName: 'QueueBoard',
    ok: {
      tasks: [
        {
          id: 'task-stale-1',
          title: 'Retained queue task',
          objective: 'Retained objective',
          status: 'awaiting_approval',
          priority: 'p1',
          risk_level: 'low',
          origin: 'board',
          project_key: 'unite',
          updated_at: '2026-08-12T00:00:00.000Z',
        },
      ],
    },
    retained: /Retained queue task/,
    refresh: ({ container }) => clickByName(container, /Refresh/i),
    actions: [/^Approve$/i, /^Defer$/i, /^Reject$/i],
  },
      // UNI-2476. Two Mission Control tiles the No-Invaders branch already edited,
  // carrying the same retain-and-present-as-current defect the tiles above were
  // fixed for. Both are READ-ONLY, so like LiveAgentOperationsMap they carry
  // `actions: []`: the VISIBLE half of the
  // contract is the whole of it here, and the INERT half is satisfied
  // vacuously. That is stated rather than left implied — an empty `actions`
  // list is otherwise indistinguishable from a fixture whose author forgot to
  // name the controls. The generic `liveActionsInStaleRegion` sweep still runs
  // over both regions, so a mutation control added to either tile later is a
  // RED run.
  {
    file: 'components/command-centre/repo-campaigns/RepoCampaignsTile.tsx',
    exportName: 'RepoCampaignsTile',
    ok: {
      source: 'cc:repo-campaigns',
      generatedAt: '2026-08-12T00:00:00.000Z',
      githubConnected: true,
      summary: { total: 1, activeCampaigns: 1, building: 1, idle: 0, planned: 0, notConnected: 0 },
      campaigns: [
        {
          name: 'Retained campaign repo',
          repo: 'CleanExpo/Unite-Group',
          purpose: 'Retained purpose',
          linearPrefix: 'UNI',
          productionUrl: null,
          state: 'building',
          source: 'live',
          isActiveCampaign: true,
          openPRs: 3,
          lastActivityAt: '2026-08-12T00:00:00.000Z',
          detail: null,
        },
      ],
    },
    retained: /Retained campaign repo/,
    refresh: tick,
    actions: [],
  },
  {
    file: 'components/command-centre/team-activity/TeamActivityTile.tsx',
    exportName: 'TeamActivityTile',
    ok: {
      source: 'cc:team-activity',
      generatedAt: '2026-08-12T00:00:00.000Z',
      repo: 'CleanExpo/CCW-CRM',
      windowDays: 14,
      disclaimer: 'Activity-derived, not clock hours.',
      github: 'live',
      githubDetail: null,
      members: [
        {
          id: 'rana',
          name: 'Retained contractor',
          commitCount: 12,
          activeDays: 3,
          daySpans: [{ date: '2026-08-11', firstAt: '09:04', lastAt: '17:22', commitCount: 5 }],
          recentSubjects: ['Retained commit subject'],
        },
      ],
      linear: { source: 'not_connected', detail: 'no Linear token' },
    },
    retained: /Retained contractor/,
    refresh: tick,
    actions: [],
  },
  // UNI-2476 second pass. The round that reviewed the two tiles above found the
  // same defect class still open in these three, all of them files this branch
  // edits. Same posture: read-only, `actions: []`, VISIBLE half only.
  //
  // InProgressPRsTile is the severe one and is worth naming: its error branch
  // is `error && !data`, so a failed refresh that RETAINED data fell through it
  // and rendered no alert whatsoever. The others at least showed an error
  // beside the stale payload; that one showed nothing.
  //
  // CostAllocationTile carries the same render shape and is deliberately NOT
  // here: it reads once on mount with no poll, no refresh control and no
  // re-key, so `error && data` is unreachable. A fixture for it fails on
  // `tick`'s own assertion that the component registered a poll — which is the
  // proof, and is why it is recorded in UNI-2479 rather than guarded here. A
  // guard with no reachable path is a guard no test can hold to account.
  {
    file: 'app/(founder)/founder/command-centre/InProgressPRsTile.tsx',
    exportName: 'InProgressPRsTile',
    ok: {
      source: 'github_api',
      scanned_at: '2026-08-12T00:00:00.000Z',
      available: true,
      entries: [
        {
          number: '962',
          title: 'Retained open PR',
          author: 'phill',
          head_ref: 'fix/false-empty-founder-shell',
          created_at: '2026-08-12T00:00:00.000Z',
          url: 'https://github.com/CleanExpo/Unite-Group/pull/962',
          age_days: 1,
          repo: 'CleanExpo/Unite-Group',
        },
      ],
      status_message: '1 open PR across 1 repo',
      read_error: null,
    },
    retained: /Retained open PR/,
    refresh: tick,
    actions: [],
  },
  {
    file: 'components/command-centre/email-accounts/EmailAccountsTile.tsx',
    exportName: 'EmailAccountsTile',
    ok: {
      source: 'cc:email-accounts',
      generatedAt: '2026-08-12T00:00:00.000Z',
      summary: { connected: 3, needsReauth: 1, notConnected: 0, total: 4 },
      providers: [
        {
          id: 'google',
          label: 'Retained provider row',
          state: 'connected',
          source: 'vault',
          lastActivityAt: '2026-08-12T00:00:00.000Z',
          detail: null,
        },
      ],
    },
    retained: /Retained provider row/,
    refresh: tick,
    actions: [],
  },
  {
    file: 'components/command-centre/margot-health/MargotHealthTile.tsx',
    exportName: 'MargotHealthTile',
    ok: {
      source: 'cc:margot-health',
      generatedAt: '2026-08-12T00:00:00.000Z',
      windowDays: 14,
      voiceReady: true,
      missionBridgeReady: true,
      config: {
        elevenLabsApiKey: true,
        margotAgentId: true,
        ingestToken: true,
        founderConfigured: true,
      },
      voice: {
        source: 'live',
        latestSessionAt: '2026-08-12T00:00:00.000Z',
        sessionsInWindow: 42,
        error: null,
      },
      agents: {
        source: 'live',
        latestSeenAt: '2026-08-12T00:00:00.000Z',
        activeCount: 7,
        error: null,
      },
    },
    retained: /42 in 14d/,
    refresh: tick,
    actions: [],
  },
  // The first MUTATING surface this branch drains, and the only one so far
  // where the INERT half of the contract does real work rather than being
  // satisfied vacuously. Every re-read on this tile is triggered by a mutation
  // handler (add / toggle / remove all `await load()`), so a failed reload left
  // the pre-mutation roster on screen with `disable` and `remove` live beside
  // it. Those two act on retained records and go offline; `refresh` is the
  // recovery control and stays live — it had to be ADDED for that reason, since
  // otherwise disabling the mutation controls removed the tile's only path back
  // to a live read.
  {
    file: 'components/command-centre/provider-accounts/ProviderAccountsTile.tsx',
    exportName: 'ProviderAccountsTile',
    ok: {
      accounts: [
        {
          accountId: 'acc-stale-1',
          provider: 'minimax',
          label: 'Retained provider account',
          planKind: 'prepaid',
          enabled: true,
          state: 'available',
          usable: true,
          prepaidExhausted: false,
          coolingUntil: null,
        },
      ],
    },
    retained: /Retained provider account/,
    refresh: ({ container }) => clickByName(container, /refresh/i),
    actions: [/^disable$/i, /^remove$/i],
  },
  // Found by the residue of the 11/08 round rather than by guessing: that round
  // fixed the COUNT and the EMPTY STATE in every file it touched and left the
  // retained LIST, so `grep -rln 'independent review 11/08/2026'` bounds the
  // population. That bound named three surfaces — ActivityFeedPanel, TeamPanel
  // and PiRouterPanel. Only ActivityFeedPanel is in THIS slice; the other two
  // arrive with the slices that ship them, and this fixture list grows then.
  //
  // The original of this comment said "the final three, and the set is closed"
  // and was left unrevised when the list was trimmed from fifteen fixtures to
  // ten — a comment describing a file's own contents, wrong about them.
  {
    file: 'components/command-centre/activity/ActivityFeedPanel.tsx',
    exportName: 'ActivityFeedPanel',
    ok: {
      source: 'cc:activity',
      generatedAt: '2026-08-12T00:00:00.000Z',
      sourceLiveAt: '2026-08-12T00:00:00.000Z',
      events: [
        {
          id: 'ev-stale-1',
          ts: '2026-08-12T00:00:00.000Z',
          agent: 'sentinel',
          verb: 'swept',
          target: 'Retained activity target',
          severity: 'info',
          origin: 'github',
        },
      ],
    },
    retained: /Retained activity target/,
    refresh: tick,
    actions: [],
  },
    ]

/**
 * Named ratchet: a count cannot say
 * WHICH surfaces were exercised. Each of these must appear in the census
 * candidate population AND be driven through the whole success → failure →
 * success sequence. A surface that stops being discoverable, or whose fixture
 * is quietly removed, is a RED run rather than a quieter green one.
 */
const MUST_SURVIVE_STALE_READ = STALE_FIXTURES.map((f) => f.file)

describe('No-Invaders: a retained payload must be marked stale and go inert', () => {
  const originalFetch = global.fetch
  const originalSetInterval = globalThis.setInterval
  const exercised: string[] = []

  afterEach(() => {
    global.fetch = originalFetch
    cleanup()
    // clearAllMocks() clears CALL HISTORY but leaves mockImplementation in
    // place, which would leave setInterval stubbed for every later test in this
    // file. restoreAllMocks() is the one that puts the original back.
    vi.restoreAllMocks()
  })

  /**
   * Runs one fixture through: successful load → failed refresh → successful
   * refresh, asserting the contract at each step.
   */
  async function driveFixture(fx: StaleFixture) {
    let failing = false
    // `pending` holds a read open so the IN-FLIGHT window can be observed. Once
    // a failing read settles the error is set again and the mark reappears, so
    // a surface that drops the mark on refresh looks identical to one that
    // never dropped it to any assertion made after the fact.
    let pending = false
    const pendingReject: { fn: (() => void) | null } = { fn: null }
    global.fetch = vi.fn(() => {
      if (pending) {
        return new Promise((_resolve, reject) => {
          pendingReject.fn = () => reject(new Error('network down'))
        })
      }
      if (failing) return Promise.reject(new Error('network down'))
      return Promise.resolve({ ok: true, status: 200, json: async () => fx.ok } as unknown as Response)
    }) as never

    // Capture the component's own poll instead of scheduling it, so the second
    // read is driven deterministically. testing-library's waitFor ticker also
    // uses setInterval (50ms), so only long intervals — nothing polls a founder
    // surface faster than a second — are intercepted; everything else goes to
    // the real timer, which is what keeps waitFor working below.
    const polls: Array<() => void> = []
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((
      cb: TimerHandler,
      ms?: number,
      ...rest: unknown[]
    ) => {
      if (typeof cb === 'function' && typeof ms === 'number' && ms >= 1000) {
        polls.push(cb as () => void)
        return 0 as unknown as ReturnType<typeof setInterval>
      }
      return (originalSetInterval as unknown as (...a: unknown[]) => ReturnType<typeof setInterval>)(
        cb,
        ms,
        ...rest,
      )
    }) as never)

    const mod = (await import(/* @vite-ignore */ path.join(ROOT, fx.file))) as Record<string, unknown>
    const Comp = mod[fx.exportName] as React.FC | undefined
    expect(Comp, `${fx.file} no longer exports ${fx.exportName}`).toBeTypeOf('function')

    const { container } = render(React.createElement(Comp as React.FC))
    const ctx: RefreshContext = { container, polls }

    // ── 1. NEGATIVE CONTROL: the ordinary success path ──────────────────────
    // Without this, "mark everything stale and disable everything" would
    // satisfy the failure assertions perfectly.
    await waitFor(() => expect(container.textContent ?? '').toMatch(fx.retained))
    expect(
      container.querySelector('[data-stale-read="true"]'),
      `${fx.file} marked a SUCCESSFUL read as stale`,
    ).toBeNull()
    for (const action of fx.actions) {
      const button = findControl(container, action)
      expect(button, `${fx.file} rendered no control matching ${action} after a good read`).toBeTruthy()
      expect(
        (button as HTMLButtonElement).disabled,
        `${fx.file} disabled ${action} after a SUCCESSFUL read`,
      ).toBe(false)
    }

    // ── 2. CONTROL: success, then a failed refresh ──────────────────────────
    failing = true
    await fx.refresh(ctx)
    await waitFor(() =>
      expect(
        container.querySelector('[data-stale-read="true"]'),
        `${fx.file} kept its previous payload after a FAILED refresh without marking it stale — ` +
          `a founder cannot tell it apart from a current read`,
      ).not.toBeNull(),
    )
    // The retained payload is still there — this sweep asks for it to be
    // MARKED, not deleted.
    expect(container.textContent ?? '').toMatch(fx.retained)
    // ...and the notice says so in words, not only in an attribute.
    expect(
      container.querySelector('[data-stale-read-notice="true"]'),
      `${fx.file} marked the region but told the founder nothing`,
    ).not.toBeNull()
    for (const action of fx.actions) {
      const button = findControl(container, action)
      expect(button, `${fx.file} lost its ${action} control entirely`).toBeTruthy()
      expect(
        (button as HTMLButtonElement).disabled,
        `${fx.file} left ${action} clickable over data from a read that has since failed`,
      ).toBe(true)
    }
    // The generic half: this fires on a mutation control added to a stale
    // region later, which the per-fixture list above cannot.
    expect(
      liveActionsInStaleRegion(container),
      `${fx.file} left these acting controls live inside its stale region`,
    ).toEqual([])

    // ── 2b. CONTROL: the mark must survive a read that is STILL failing ─────
    // A loader that clears its error on ENTRY (`setError(null)` before the
    // fetch) drops the mark the instant a refresh starts. Nothing has succeeded
    // — the payload on screen is the same stale one — but the region un-marks
    // and its actions come back live for the whole in-flight window. Worse than
    // a blemish: the realtime lanes re-read on every visible row change, so the
    // window recurs with no founder action at all. The mark may only clear when
    // a read SUCCEEDS, which is what stage 3 then asserts.
    pending = true
    await fx.refresh(ctx)
    expect(
      container.querySelector('[data-stale-read="true"]'),
      `${fx.file} dropped its stale mark while a replacement read was still in flight — ` +
        `it clears the error before any read has succeeded, so the retained payload ` +
        `goes unmarked and indistinguishable from current data`,
    ).not.toBeNull()
    for (const action of fx.actions) {
      // A surface that swaps its retained payload for a loading state while the
      // read is in flight removes the control entirely — a STRONGER form of
      // inert than a disabled one, because there is nothing on screen to act on
      // (InvoicesClient renders a spinner, ReconciliationTab skeleton rows).
      // Only a control still RENDERED has to prove it is disabled. Verified NOT
      // vacuous by inverting this assertion: QueueBoard, WorkPacketLane and
      // ProviderAccountsTile all reach it. TeamPanel does not — its controls are
      // absent in this window — so do not read it as covering every fixture.
      const control = findControl(container, action)
      if (!control) continue
      expect(
        control.disabled,
        `${fx.file} re-enabled ${action} while a replacement read was still in flight, ` +
          `over the payload of a read that has since failed`,
      ).toBe(true)
    }
    // Let the in-flight read fail so the surface is back in the marked state
    // stage 3 recovers from.
    await act(async () => {
      pendingReject.fn?.()
      await Promise.resolve()
    })
    pending = false

    // ── 3. NEGATIVE CONTROL: a SUCCESSFUL refresh recovers ──────────────────
    // A surface that latches stale forever is honest and useless. The mark must
    // clear and the actions must come back.
    failing = false
    await fx.refresh(ctx)
    await waitFor(() =>
      expect(
        container.querySelector('[data-stale-read="true"]'),
        `${fx.file} stayed marked stale after a read SUCCEEDED again`,
      ).toBeNull(),
    )
    for (const action of fx.actions) {
      expect(
        findControl(container, action)?.disabled,
        `${fx.file} left ${action} disabled after a read SUCCEEDED again`,
      ).toBe(false)
    }

    exercised.push(fx.file)
  }

  it('the stale-region detector flags a live action and clears an inert one', () => {
    // NEGATIVE CONTROL for the predicate itself. Without it, an empty
    // `liveActionsInStaleRegion` result is indistinguishable from a predicate
    // that can no longer see anything.
    const host = document.createElement('div')

    host.innerHTML = '<div data-stale-read="true"><button>Approve</button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual(['Approve'])

    host.innerHTML = '<div data-stale-read="true"><button disabled>Approve</button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // aria-label, not text, is the accessible name for icon-only controls.
    host.innerHTML = '<div data-stale-read="true"><button aria-label="Reject packet"></button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual(['Reject packet'])

    // POSITIVE CONTROL for the `propose` verb. It was missing from
    // MUTATION_CONTROL, so KanbanBoard's Propose button — inside a marked
    // region, POSTing /api/kanban/generate-next from retained cards — read as
    // clean. A verb the list does not contain is a hole nothing reports.
    // [UNI-2495]
    host.innerHTML = '<div data-stale-read="true"><button>Propose</button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual(['Propose'])

    host.innerHTML = '<div data-stale-read="true"><button disabled>Propose</button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // Recovery and read-only controls are NOT actions and must stay clear, or
    // the guard would force surfaces to trap themselves in a degraded state.
    host.innerHTML =
      '<div data-stale-read="true"><button>Refresh</button><button>Validation</button><button>Show all</button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // Outside a marked region the predicate says nothing — it is a statement
    // about stale regions, not a global ban on Approve buttons.
    host.innerHTML = '<div><button>Approve</button></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // POSITIVE CONTROL for SELECTION controls. [UNI-2502]
    //
    // The detector scanned `button` only, so ReconciliationTab's live row
    // checkboxes were invisible and its fixture PASSED while reporting the
    // surface's "actions offline". A checkbox carries no verb and usually no
    // accessible name, so widening the element query without dropping the
    // MUTATION_CONTROL gate for these would have left the same hole.
    host.innerHTML = '<div data-stale-read="true"><input type="checkbox" /></div>'
    expect(liveActionsInStaleRegion(host)).toEqual(['<input type="checkbox">'])

    host.innerHTML = '<div data-stale-read="true"><input type="checkbox" disabled /></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // Named selection controls report their name, so a failure is diagnosable.
    host.innerHTML =
      '<div data-stale-read="true"><input type="checkbox" aria-label="Select transaction" /></div>'
    expect(liveActionsInStaleRegion(host)).toEqual(['Select transaction'])

    // NEGATIVE CONTROL, and a deliberate exclusion rather than a gap. A
    // <select> changes a view or feeds a separately-guarded form; it does not
    // act on a record. Including it flagged five false positives in one sweep —
    // a business filter and two provider pickers whose Save was already
    // disabled — and forcing those inert would strand the founder in a degraded
    // view with no way to look around.
    host.innerHTML = '<div data-stale-read="true"><select aria-label="Business filter"></select></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // Selection outside a marked region is not this guard's business.
    host.innerHTML = '<div><input type="checkbox" /></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])

    // aria-disabled is honoured for controls with no native disabled property.
    host.innerHTML =
      '<div data-stale-read="true"><span role="button" aria-disabled="true">Approve</span></div>'
    expect(liveActionsInStaleRegion(host)).toEqual([])
    host.innerHTML = '<div data-stale-read="true"><span role="button">Approve</span></div>'
    expect(liveActionsInStaleRegion(host)).toEqual(['Approve'])
  })

  it('every pinned surface is still in the census population', () => {
    // The behavioural sweep imports these by path, so it would keep passing
    // even if a surface stopped being a discoverable client-component-that-
    // fetches. That is exactly how KnowledgeConsoleClient was lost. Assert the
    // pins against the SAME discovery the rest of this file uses.
    const population = candidates().map(rel)
    for (const file of MUST_SURVIVE_STALE_READ) {
      expect(
        population,
        `${file} is pinned for stale-read behaviour but is no longer in the census population`,
      ).toContain(file)
    }
  })

  for (const fx of STALE_FIXTURES) {
    it(`${fx.file} marks a retained payload and takes its actions offline`, async () => {
      await driveFixture(fx)
    }, 20_000)
  }

  it('reports which surfaces were actually driven through the sequence', () => {
    // Vitest runs `it`s in declaration order within a describe, so this lands
    // after the sweep above. An empty `exercised` list therefore means the
    // sweep did not run — not that it passed.
    console.log(
      `[no-invaders] stale-read sweep exercised ${exercised.length}\n` +
        exercised.map((f) => `  STALE-READ ${f}`).join('\n'),
    )
    expect(exercised.slice().sort()).toEqual([...MUST_SURVIVE_STALE_READ].sort())
  })
})
