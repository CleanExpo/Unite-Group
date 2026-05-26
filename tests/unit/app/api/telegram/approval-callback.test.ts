import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { NextRequest } from 'next/server';
import type { ApprovalGate } from '@/lib/personal-intelligence/approval-gate';
import { createApplyRequestShortId, encodeDecisionCallbackData } from '@/lib/personal-intelligence/phase-1i-decision-ledger';

const signingKey = 'phase-1i-test-signing-key';
const request = { id: 'apply-memory-1', phase: '1H' as const, sourceDryRunId: 'dry-run-1', sourceCandidateId: 'candidate-1', sourceReviewStatus: 'approved' as const, sourceDecisionType: 'dry_run_memory_write_request' as const, requestedActionType: 'memory_apply_request' as const, rationale: 'Human should approve memory only after evidence review.', riskLevel: 'high' as const, requiresHumanApproval: true as const, applyState: 'pending_human_gate' as const, createdAt: '2026-05-25T19:00:00.000Z', evidenceRefs: ['docs/margot/personal-intelligence/approval-gate/example.json'], guardrailFlags: ['human_gate_required'], noSideEffectDeclaration: true as const, title: 'Memory proposal' };
const gate: ApprovalGate = { gateName: 'phase-1h-example', generatedAt: '2026-05-25T19:00:00.000Z', preparedBy: 'Margot', approvalDryRunPath: 'x', approvalHandoffPath: 'x', approvalLedgerPath: 'x', sourceRegisterPath: 'x', sourceNotePath: 'x', applyRequests: [request], sideEffectBoundaries: ['No apply execution path was created or invoked.'] };
function tempFile(name: string): string { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'phase-1i-route-')), name); }
function signedData(action: 'approve' | 'reject' | 'defer' | 'request_changes' | 'view_evidence', userId = '123456789'): string { return encodeDecisionCallbackData({ action, applyRequestShortId: createApplyRequestShortId(request.id), nonce: 'k3f82p', context: { chatId: '-100123456', userId }, signingKey }); }
function callbackRequest(data: string, userId = '123456789'): NextRequest { return new NextRequest('http://localhost/api/telegram/approval-callback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query: { id: 'callback-1', from: { id: userId, username: 'phill', first_name: 'Phill' }, message: { chat: { id: '-100123456' }, message_id: 99, text: 'Phase 1H approval request: Memory proposal' }, data } }) }); }

describe('/api/telegram/approval-callback Phase 1I', () => {
  beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); process.env.TELEGRAM_BOT_TOKEN = 'test-token'; process.env.TELEGRAM_DECISION_SIGNING_KEY = signingKey; global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ ok: true }) }); });
  it('writes one local-only decision record and updates original Telegram message', async () => {
    const gatePath = tempFile('gate.json'); const ledgerPath = tempFile('decisions.jsonl'); fs.writeFileSync(gatePath, JSON.stringify(gate)); process.env.PI_APPROVAL_GATE_PATH = gatePath; process.env.PI_DECISION_LEDGER_PATH = ledgerPath;
    const { POST } = await import('@/app/api/telegram/approval-callback/route'); const res = await POST(callbackRequest(signedData('approve'))); const body = await res.json();
    expect(res.status).toBe(200); expect(body).toMatchObject({ ok: true, action: 'approve', applyRequestId: 'apply-memory-1' });
    const records = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line)); expect(records).toHaveLength(1); expect(records[0]).toMatchObject({ applyRequestId: 'apply-memory-1', action: 'approve', source: 'telegram-inline' });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/answerCallbackQuery'), expect.any(Object)); expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/editMessageText'), expect.objectContaining({ body: expect.stringContaining('Decision state: approve by Phill') })); expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/editMessageReplyMarkup'), expect.any(Object));
  });
  it('returns evidence without appending a record', async () => {
    const gatePath = tempFile('gate.json'); const ledgerPath = tempFile('decisions.jsonl'); fs.writeFileSync(gatePath, JSON.stringify(gate)); process.env.PI_APPROVAL_GATE_PATH = gatePath; process.env.PI_DECISION_LEDGER_PATH = ledgerPath;
    const { POST } = await import('@/app/api/telegram/approval-callback/route'); const res = await POST(callbackRequest(signedData('view_evidence'))); const body = await res.json();
    expect(res.status).toBe(200); expect(body.action).toBe('view_evidence'); expect(fs.existsSync(ledgerPath)).toBe(false); expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/sendMessage'), expect.objectContaining({ body: expect.stringContaining('docs/margot/personal-intelligence/approval-gate/example.json') }));
  });
  it('fails closed on bad sig, parse failure, and non-pending state', async () => {
    const gatePath = tempFile('gate.json'); const ledgerPath = tempFile('decisions.jsonl'); fs.writeFileSync(gatePath, JSON.stringify({ ...gate, applyRequests: [{ ...request, applyState: 'applied' }] })); process.env.PI_APPROVAL_GATE_PATH = gatePath; process.env.PI_DECISION_LEDGER_PATH = ledgerPath;
    const { POST } = await import('@/app/api/telegram/approval-callback/route'); expect((await POST(callbackRequest(signedData('approve'), '999'))).status).toBe(400); expect((await POST(callbackRequest('h1|A||k3f82p|Qm1x9aZp2R'))).status).toBe(400); expect((await POST(callbackRequest(signedData('approve')))).status).toBe(400); expect(fs.existsSync(ledgerPath)).toBe(false);
  });
});
