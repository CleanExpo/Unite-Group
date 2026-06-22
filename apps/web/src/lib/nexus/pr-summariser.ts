// src/lib/nexus/pr-summariser.ts
// AI-generated PR summaries for the Nexus approval gate.
// Uses Haiku for cost-effective summarisation.

import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import type { NexusPR } from './github-prs'

const SYSTEM_PROMPT = `You are RANA, the Nexus review assistant. Summarise a GitHub pull request for the founder in 2–3 plain sentences. State what changed, why it matters, and flag any notable risk. No markdown, no bullet points — plain sentences only.`

export async function summarisePR(pr: NexusPR): Promise<string> {
  try {
    const client = getAIClient()

    const fileList = pr.files
      .map(f => `${f.filename} (+${f.additions}/-${f.deletions})`)
      .join(', ')

    const diffSample = pr.files
      .filter(f => f.patch)
      .slice(0, 2)
      .map(f => `--- ${f.filename} ---\n${f.patch!.slice(0, 400)}`)
      .join('\n\n')

    const userContent = [
      `PR #${pr.number} in ${pr.owner}/${pr.repo}: ${pr.title}`,
      pr.body ? `Description: ${pr.body.slice(0, 500)}` : '',
      `Files changed (${pr.fileCount} total): ${fileList || 'none'}`,
      diffSample ? `Diff sample:\n${diffSample}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const response = await client.messages.create({
      model: ANTHROPIC_MODELS.HAIKU,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    return response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  } catch (err) {
    console.warn('[Nexus] summarisePR error:', err)
    return ''
  }
}

export async function summarisePRs(prs: NexusPR[]): Promise<NexusPR[]> {
  return Promise.all(
    prs.map(async pr => ({
      ...pr,
      aiSummary: await summarisePR(pr),
    })),
  )
}
