import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash, verify } from 'node:crypto'
import { join } from 'node:path'

export const INLINE_TOOL_OUTPUT_LIMIT = 4_000
const DATA_DIR = join(process.cwd(), '.runtime', 'tool-artifacts')
const INDEX_FILE = join(DATA_DIR, 'index.json')
const PREVIEW_LIMIT = 1_000

export type ToolArtifactKind =
  'tool_output' | 'file_read' | 'terminal_log' | 'diff' | 'skill_doc'

export type ToolArtifact = {
  id: string
  sessionId: string
  messageId?: string
  toolCallId?: string
  toolName?: string
  kind: ToolArtifactKind
  title: string
  summary: string
  preview: string
  contentSize: number
  contentPath: string
  createdAt: number
}

/**
 * A broker-issued receipt is deliberately persisted outside this store. Tool
 * artifact writers can choose their own content and labels, but they cannot
 * issue a receipt: only the external receipt broker holds the private key.
 */
export type TrustedReceiptSource =
  'test-runner' | 'independent-review' | 'external-service'

export type TrustedToolArtifactReceipt = {
  version: 1
  issuer: 'runtime-receipt-broker'
  source: TrustedReceiptSource
  taskId: string
  workerId: string
  artifactId: string
  sha256: string
  producer: {
    sessionId: string
    toolName: string
  }
  issuedAt: number
  signature: string
}

type ArtifactIndex = {
  artifacts: Record<string, ToolArtifact>
}

const RECEIPT_BROKER_DIR_ENV = 'RUNTIME_CONTROL_PLANE_RECEIPT_BROKER_DIR'
const RECEIPT_BROKER_PUBLIC_KEY_ENV =
  'RUNTIME_CONTROL_PLANE_RECEIPT_BROKER_PUBLIC_KEY'
const RECEIPT_MAX_AGE_MS = 10 * 60 * 1000
const RECEIPT_FUTURE_SKEW_MS = 30 * 1000

const TRUSTED_PRODUCER_TOOL: Record<TrustedReceiptSource, string> = {
  'test-runner': 'test-runner',
  'independent-review': 'independent-review',
  'external-service': 'external-service',
}

let index: ArtifactIndex = { artifacts: {} }

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function loadIndex(): void {
  try {
    if (!existsSync(INDEX_FILE)) return
    const parsed = JSON.parse(
      readFileSync(INDEX_FILE, 'utf-8'),
    ) as ArtifactIndex
    if (parsed && typeof parsed === 'object' && parsed.artifacts) {
      index = parsed
    }
  } catch {
    index = { artifacts: {} }
  }
}

function saveIndex(): void {
  ensureDataDir()
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
}

loadIndex()

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 160) || 'unknown'
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function trustedReceiptPayload(
  receipt: Omit<TrustedToolArtifactReceipt, 'signature'>,
): string {
  return JSON.stringify({
    version: receipt.version,
    issuer: receipt.issuer,
    source: receipt.source,
    taskId: receipt.taskId,
    workerId: receipt.workerId,
    artifactId: receipt.artifactId,
    sha256: receipt.sha256,
    producer: receipt.producer,
    issuedAt: receipt.issuedAt,
  })
}

function trustedSource(value: string): value is TrustedReceiptSource {
  return (
    value === 'test-runner' ||
    value === 'independent-review' ||
    value === 'external-service'
  )
}

function brokerReceiptPath(artifactId: string): string | null {
  if (!/^toolout_[a-f0-9]{16}$/i.test(artifactId)) return null
  const directory = process.env[RECEIPT_BROKER_DIR_ENV]
  return typeof directory === 'string' && directory.trim()
    ? join(directory, `${artifactId}.json`)
    : null
}

function readBrokerReceipt(
  artifactId: string,
): TrustedToolArtifactReceipt | null {
  const path = brokerReceiptPath(artifactId)
  if (!path || !existsSync(path)) return null
  try {
    const parsed = JSON.parse(
      readFileSync(path, 'utf8'),
    ) as Partial<TrustedToolArtifactReceipt>
    if (
      parsed.version !== 1 ||
      parsed.issuer !== 'runtime-receipt-broker' ||
      !trustedSource(String(parsed.source ?? '')) ||
      typeof parsed.taskId !== 'string' ||
      typeof parsed.workerId !== 'string' ||
      typeof parsed.artifactId !== 'string' ||
      typeof parsed.sha256 !== 'string' ||
      !parsed.producer ||
      typeof parsed.producer.sessionId !== 'string' ||
      typeof parsed.producer.toolName !== 'string' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.signature !== 'string'
    )
      return null
    return parsed as TrustedToolArtifactReceipt
  } catch {
    return null
  }
}

function artifactContentPath(sessionId: string, artifactId: string): string {
  return join(DATA_DIR, sanitizePathSegment(sessionId), `${artifactId}.json`)
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} chars`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}k chars`
  return `${(size / (1024 * 1024)).toFixed(1)}m chars`
}

function previewText(content: string): string {
  const cleaned = content.replace(/\r\n/g, '\n').trim()
  if (cleaned.length <= PREVIEW_LIMIT) return cleaned
  return `${cleaned.slice(0, PREVIEW_LIMIT)}…`
}

function inferArtifactKind(toolName?: string, text?: string): ToolArtifactKind {
  const name = (toolName || '').toLowerCase()
  if (name.includes('read_file') || name === 'read' || name === 'file_read') {
    return 'file_read'
  }
  if (
    name.includes('terminal') ||
    name.includes('exec') ||
    name.includes('bash')
  ) {
    return 'terminal_log'
  }
  if (name.includes('skill')) return 'skill_doc'
  if (name.includes('patch') || /^diff --git/m.test(text || '')) return 'diff'
  return 'tool_output'
}

export function listToolArtifacts(sessionId?: string): Array<ToolArtifact> {
  return Object.values(index.artifacts)
    .filter((artifact) => !sessionId || artifact.sessionId === sessionId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getToolArtifact(
  artifactId: string,
): (ToolArtifact & { content: string }) | null {
  const artifact = index.artifacts[artifactId]
  if (!artifact) return null
  try {
    const raw = readFileSync(artifact.contentPath, 'utf-8')
    const parsed = JSON.parse(raw) as { content?: unknown }
    return {
      ...artifact,
      content: typeof parsed.content === 'string' ? parsed.content : '',
    }
  } catch {
    return { ...artifact, content: '' }
  }
}

/** Verify an externally brokered receipt and all persisted producer bindings. */
export function verifyTrustedToolArtifactReceipt(input: {
  artifactId: string
  sha256: string
  taskId: string
  workerId: string
  now: number
}): boolean {
  const artifact = getToolArtifact(input.artifactId)
  const receipt = readBrokerReceipt(input.artifactId)
  const publicKey = process.env[RECEIPT_BROKER_PUBLIC_KEY_ENV]
  if (!artifact || !receipt || !publicKey || !trustedSource(receipt.source))
    return false
  const expectedToolName = TRUSTED_PRODUCER_TOOL[receipt.source]
  if (
    !Number.isFinite(input.now) ||
    input.now - receipt.issuedAt > RECEIPT_MAX_AGE_MS ||
    receipt.issuedAt - input.now > RECEIPT_FUTURE_SKEW_MS ||
    receipt.artifactId !== artifact.id ||
    receipt.sha256 !== input.sha256 ||
    receipt.sha256 !== hashString(artifact.content) ||
    receipt.taskId !== input.taskId ||
    receipt.workerId !== input.workerId ||
    receipt.producer.sessionId !== artifact.sessionId ||
    receipt.producer.toolName !== artifact.toolName ||
    receipt.producer.toolName !== expectedToolName
  )
    return false

  try {
    return verify(
      null,
      Buffer.from(
        trustedReceiptPayload({ ...receipt, signature: undefined } as Omit<
          TrustedToolArtifactReceipt,
          'signature'
        >),
      ),
      publicKey,
      Buffer.from(receipt.signature, 'base64'),
    )
  } catch {
    return false
  }
}

type CreateArtifactInput = {
  sessionId: string
  messageId?: string
  toolCallId?: string
  toolName?: string
  content: string
  title?: string
  summary?: string
  kind?: ToolArtifactKind
}

export function createOrUpdateToolArtifact(
  input: CreateArtifactInput,
): ToolArtifact {
  const stableKey = [
    input.sessionId,
    input.messageId || '',
    input.toolCallId || '',
    input.toolName || '',
    hashString(input.content),
  ].join('\n')
  const id = `toolout_${hashString(stableKey).slice(0, 16)}`
  const contentPath = artifactContentPath(input.sessionId, id)
  const createdAt = index.artifacts[id]?.createdAt ?? Date.now()
  const kind = input.kind ?? inferArtifactKind(input.toolName, input.content)
  const title = input.title ?? `${input.toolName || 'tool'} output`
  const summary =
    input.summary ??
    `${title} externalized (${formatBytes(input.content.length)}). Full output stored as artifact ${id}.`
  const artifact: ToolArtifact = {
    id,
    sessionId: input.sessionId,
    messageId: input.messageId,
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    kind,
    title,
    summary,
    preview: previewText(input.content),
    contentSize: input.content.length,
    contentPath,
    createdAt,
  }

  const dir = join(DATA_DIR, sanitizePathSegment(input.sessionId))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(
    contentPath,
    JSON.stringify(
      {
        artifact: { ...artifact, contentPath: undefined },
        content: input.content,
      },
      null,
      2,
    ),
  )
  index.artifacts[id] = artifact
  saveIndex()
  return artifact
}

function readMessageText(message: Record<string, unknown>): string {
  const content = message.content
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (!part || typeof part !== 'object') return ''
        const record = part as Record<string, unknown>
        if (record.type === 'text' || record.type === 'tool_result') {
          return typeof record.text === 'string' ? record.text : ''
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
    if (text.trim()) return text
  }
  if (typeof message.text === 'string') return message.text
  return ''
}

function compactContentForMessage(
  originalContent: unknown,
  compactText: string,
): Array<Record<string, unknown>> {
  if (!Array.isArray(originalContent) || originalContent.length === 0) {
    return [{ type: 'text', text: compactText }]
  }
  return originalContent.map((part) => {
    if (!part || typeof part !== 'object')
      return part as Record<string, unknown>
    const record = part as Record<string, unknown>
    if (record.type === 'text') return { ...record, text: compactText }
    if (record.type === 'tool_result') return { ...record, text: compactText }
    return record
  })
}

export function externalizeLargeToolOutput<T extends Record<string, unknown>>(
  sessionId: string,
  message: T,
  limit = INLINE_TOOL_OUTPUT_LIMIT,
): T & Record<string, unknown> {
  const role = typeof message.role === 'string' ? message.role : ''
  const normalizedRole = role.toLowerCase()
  if (!['tool', 'toolresult', 'tool_result'].includes(normalizedRole)) {
    return message
  }

  const outputText = readMessageText(message)
  if (outputText.length <= limit) return message

  const toolName =
    typeof message.toolName === 'string'
      ? message.toolName
      : typeof message.tool_name === 'string'
        ? message.tool_name
        : 'tool'
  const messageId = typeof message.id === 'string' ? message.id : undefined
  const toolCallId =
    typeof message.toolCallId === 'string'
      ? message.toolCallId
      : typeof message.tool_call_id === 'string'
        ? message.tool_call_id
        : undefined
  const artifact = createOrUpdateToolArtifact({
    sessionId,
    messageId,
    toolCallId,
    toolName,
    content: outputText,
    title: `${toolName} output`,
  })
  const compactText = `${artifact.summary}\n\nPreview:\n${artifact.preview}`

  return {
    ...message,
    text: compactText,
    content: compactContentForMessage(message.content, compactText),
    artifactId: artifact.id,
    artifactKind: artifact.kind,
    artifactSummary: artifact.summary,
    artifactContentSize: artifact.contentSize,
    artifactPreview: artifact.preview,
    details: {
      ...((message.details && typeof message.details === 'object'
        ? message.details
        : {}) as Record<string, unknown>),
      artifact: {
        id: artifact.id,
        kind: artifact.kind,
        title: artifact.title,
        summary: artifact.summary,
        contentSize: artifact.contentSize,
      },
    },
  }
}
