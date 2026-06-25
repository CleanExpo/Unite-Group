import fs from 'node:fs/promises'
import path from 'node:path'
import type { Dirent } from 'node:fs'

const DEFAULT_OBSIDIAN_VAULT_PATH = '/Users/phillmcgurk/2nd-brain'
const DEFAULT_IMPORTED_MIRROR_PATH =
  '/Users/phillmcgurk/Unite-Group/docs/brain/2nd Brain'

export type MissionControlOsStatus = Awaited<
  ReturnType<typeof buildMissionControlOsStatus>
>

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function countMarkdownFiles(root: string, maxDepth = 2): Promise<number> {
  async function walk(currentPath: string, depth: number): Promise<number> {
    if (depth > maxDepth) return 0

    let entries: Array<Dirent>
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true })
    } catch {
      return 0
    }

    let total = 0
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const entryPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        total += await walk(entryPath, depth + 1)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        total += 1
      }
    }
    return total
  }

  return walk(root, 0)
}

async function listTopFolders(root: string): Promise<Array<string>> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 12)
  } catch {
    return []
  }
}

export async function buildMissionControlOsStatus(
  options: { vaultPath?: string; mirrorPath?: string } = {},
) {
  const vaultPath =
    options.vaultPath ||
    process.env.OBSIDIAN_VAULT_PATH ||
    process.env.OBSIDIAN_VAULT ||
    DEFAULT_OBSIDIAN_VAULT_PATH
  const mirrorPath =
    options.mirrorPath ||
    process.env.OBSIDIAN_IMPORTED_MIRROR_PATH ||
    DEFAULT_IMPORTED_MIRROR_PATH
  const [vaultExists, mirrorExists] = await Promise.all([
    exists(vaultPath),
    exists(mirrorPath),
  ])
  const [folders, markdownFiles, mirrorMarkdownFiles] = await Promise.all([
    vaultExists ? listTopFolders(vaultPath) : Promise.resolve([]),
    vaultExists ? countMarkdownFiles(vaultPath, 2) : Promise.resolve(0),
    mirrorExists ? countMarkdownFiles(mirrorPath, 2) : Promise.resolve(0),
  ])

  return {
    ok: true,
    title: 'Mission Control',
    mode: 'systems-over-models',
    checkedAt: Date.now(),
    reference: 'Julian Goldie Agent OS + Obsidian + Memory Galaxy',
    guardrails: [
      'mission-control-name-locked',
      'no-sakana-fugu-logic',
      'no-new-vendors',
      'dry-run-before-side-effects',
    ],
    decisionSurface: {
      headline: 'Build the OS from local truth first.',
      recommendation:
        'Keep Mission Control as the command surface and use Obsidian as the memory layer before adding connectors.',
      why: 'Phill can act from a 2-10 line card: current signal, recommended next safe action, evidence path, approval gate, and fallback.',
      nextSafeAction:
        'Generate a local mission packet from the selected domain; do not publish, deploy, or write production data.',
      approvalGate: 'External side effects require explicit operator approval.',
    },
    obsidian: {
      status: vaultExists ? 'connected' : 'missing',
      path: vaultPath,
      readFirst: path.join(vaultPath, 'CLAUDE.md'),
      markdownFiles,
      folders,
      mirror: {
        status: mirrorExists ? 'connected' : 'missing',
        path: mirrorPath,
        markdownFiles: mirrorMarkdownFiles,
      },
    },
    featureMap: [
      {
        id: 'memory-galaxy',
        label: 'Memory Galaxy',
        status: vaultExists ? 'connected' : 'needs-vault',
        source: 'Obsidian 2nd Brain',
        description: 'Canonical markdown memory layer and source graph.',
      },
      {
        id: 'hermes-jarvis',
        label: 'Hermes Jarvis',
        status: 'ready-local',
        source: 'Hermes + computer use + TTS',
        description:
          'Voice/command layer, daily briefing, history and warm monitor mode.',
      },
      {
        id: 'news-radar',
        label: 'News Radar',
        status: 'dry-run',
        source: 'Existing research/blogwatch tools',
        description:
          '24/7 intelligence radar using approved local/current-source tools.',
      },
      {
        id: 'video-agent',
        label: 'Video Agent',
        status: 'linked',
        source: 'Video Command Center',
        description: 'Remotion/video packets and render queue connection.',
      },
      {
        id: 'seo-agent-os',
        label: 'SEO Agent OS',
        status: 'approval-gated',
        source: 'Unite/Synthex workflows + Obsidian context',
        description:
          'Keyword-to-local-draft SEO workflow with case-study memory, markdown preview and deploy history.',
      },
      {
        id: 'loop-engineering',
        label: 'Loop Engineering',
        status: 'operator-gated',
        source: 'Hermes workflows',
        description:
          'Self-improvement loops with local evidence and approval boundaries.',
      },
    ],
    quickCommands: [
      {
        id: 'daily-priority-brief',
        label: 'Daily priority brief',
        prompt:
          'Read the canonical 2nd Brain and Mission Control status, then produce a 5-line founder decision card with evidence paths.',
        mode: 'local-draft',
      },
      {
        id: 'source-to-shape',
        label: 'Source → Shape',
        prompt:
          'Scan recent Sources and Outcomes, propose at most three Sketch promotions, and save a local Outcomes report only.',
        mode: 'read-only-proposal',
      },
      {
        id: 'seo-approval-packet',
        label: 'SEO approval packet',
        prompt:
          'Generate keyword-to-local-draft SEO packets using Obsidian case-study context; keep public publishing disabled.',
        mode: 'approval-gated',
      },
      {
        id: 'video-command-packet',
        label: 'Video command packet',
        prompt:
          'Build a local video production packet with script, asset list, verification checklist, and render fallback plan.',
        mode: 'local-draft',
      },
    ],
    operatorGates: [
      'production database writes',
      'deployments and public publishing',
      'client communications',
      'billing or finance actions',
      'new vendors, accounts, or connector platforms',
    ],
  }
}
