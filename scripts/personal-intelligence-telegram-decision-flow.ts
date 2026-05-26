import * as fs from 'fs';
import * as path from 'path';
import type { ApprovalGate } from '../src/lib/personal-intelligence/approval-gate';
import { buildTelegramApprovalKeyboard, createApplyRequestShortId, createEvidenceSummary } from '../src/lib/personal-intelligence/phase-1i-decision-ledger';

const [gatePath, outputDir] = process.argv.slice(2);
if (!gatePath || !outputDir) throw new Error('Usage: TELEGRAM_DECISION_SIGNING_KEY=<key> ts-node scripts/personal-intelligence-telegram-decision-flow.ts <gate-json> <output-dir>');
const signingKey = process.env.TELEGRAM_DECISION_SIGNING_KEY;
if (!signingKey) throw new Error('TELEGRAM_DECISION_SIGNING_KEY is required');
const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence/telegram-decision-flow');
const absoluteOutputDir = path.resolve(outputDir);
fs.mkdirSync(safeRoot, { recursive: true });
if (path.relative(safeRoot, absoluteOutputDir).startsWith('..')) throw new Error(`Refusing output outside ${safeRoot}`);
const gate = JSON.parse(fs.readFileSync(path.resolve(gatePath), 'utf8')) as ApprovalGate;
const context = { chatId: '-100-example-chat', userId: '123456789', nowMs: Date.parse(gate.generatedAt) };
let n = 0;
const artifact = {
  phase: '1I',
  generatedAt: gate.generatedAt,
  sourceApprovalGatePath: gatePath,
  callbackSchema: 'h1|<a>|<r>|<n>|<s>',
  safetyBoundary: 'Telegram message handling plus local-only append ledger only; no apply execution path.',
  examples: gate.applyRequests.map((request) => ({
    applyRequestId: request.id,
    applyRequestShortId: createApplyRequestShortId(request.id),
    title: request.title,
    requestedActionType: request.requestedActionType,
    telegramMessage: { reply_markup: buildTelegramApprovalKeyboard({ applyRequestId: request.id, context, signingKey, nonceFactory: () => `n${String(++n).padStart(5, '0')}` }) },
    evidencePreview: createEvidenceSummary(gate, request.id).split('\n').slice(0, 8),
  })),
};
fs.mkdirSync(absoluteOutputDir, { recursive: true });
const base = `${gate.gateName.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-phase-1i-telegram-decision-flow`;
const jsonPath = path.join(absoluteOutputDir, `${base}.json`);
const mdPath = path.join(absoluteOutputDir, `${base}.md`);
fs.writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
fs.writeFileSync(mdPath, `# Phase 1I Telegram Decision Flow Example\n\nSource gate: ${gatePath}\n\nButtons: ✅ Approve, ❌ Reject, ⏸ Defer, 📝 Request Changes, 🔍 View Evidence.\n\nSafety: local decision ledger append only; no memory/task/routing/archive/apply execution.\n`);
process.stdout.write(`Phase 1I Telegram flow JSON written: ${jsonPath}\nPhase 1I Telegram flow Markdown written: ${mdPath}\nTelegram approval examples: ${artifact.examples.length}\n`);
