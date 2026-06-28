import { createFileRoute } from '@tanstack/react-router'
import { writeFile, mkdir, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BEARER_TOKEN, CLAUDE_API } from '../../server/gateway-capabilities'
import { requireLocalOrAuth } from '../../server/auth-middleware'

// Quick-run: fire a Mission Control Quick Command as a headless, plan-backed
// run through the gateway, then file the output into the 2nd Brain vault
// (Chase AI level 2: every run lands in outputs/ + a log.md line so loops can
// self-improve). Read-only by design — it generates a draft; it does not push,
// deploy, or write production data.

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

type QuickRunResult = {
  ok: boolean
  text?: string
  file?: string
  error?: string
}

export const Route = createFileRoute('/api/quick-run')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!requireLocalOrAuth(request)) {
          return Response.json(
            { ok: false, error: 'Authentication required' } satisfies QuickRunResult,
            { status: 401 },
          )
        }

        const body = (await request.json().catch(() => ({}))) as {
          prompt?: string
          label?: string
        }
        const prompt = (body.prompt ?? '').trim()
        const label = (body.label ?? 'quick-run').trim()
        if (!prompt) {
          return Response.json(
            { ok: false, error: 'prompt required' } satisfies QuickRunResult,
            { status: 400 },
          )
        }

        // Headless plan-backed run via the OpenAI-compatible gateway. `empire`
        // maps to the configured primary provider (a plan, not an API key).
        let text = ''
        try {
          const res = await fetch(`${CLAUDE_API}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(BEARER_TOKEN ? { Authorization: `Bearer ${BEARER_TOKEN}` } : {}),
            },
            body: JSON.stringify({
              model: 'empire',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1500,
              stream: false,
            }),
          })
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `gateway ${res.status}` } satisfies QuickRunResult,
              { status: 502 },
            )
          }
          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>
          }
          text = data.choices?.[0]?.message?.content ?? ''
        } catch (e) {
          return Response.json(
            { ok: false, error: `gateway unreachable: ${String(e)}` } satisfies QuickRunResult,
            { status: 502 },
          )
        }

        // File the output into the vault (level-2 memory loop).
        const vault = (process.env.KNOWLEDGE_DIR || process.env.OBSIDIAN_VAULT || '').trim()
        let file = ''
        if (vault) {
          const stamp = new Date().toISOString().slice(0, 10)
          const name = `${stamp}-${slug(label)}.md`
          try {
            const dir = join(vault, 'outputs')
            await mkdir(dir, { recursive: true })
            file = join(dir, name)
            // Write as an OKF concept (type/name/description frontmatter) so the
            // output is a first-class, index-able knowledge-base entry.
            await writeFile(
              file,
              `---\ntype: output\nname: ${label}\ndescription: Mission Control quick-run output (${stamp})\nokf_version: "0.1"\ncreated: ${new Date().toISOString()}\n---\n\n# ${label}\n\n${text}\n`,
            )
            await appendFile(
              join(vault, 'log.md'),
              `\n${stamp} | quick-run | outputs/${name} | ${label}`,
            )
          } catch {
            file = ''
          }
        }

        return Response.json({ ok: true, text, file } satisfies QuickRunResult)
      },
    },
  },
})
