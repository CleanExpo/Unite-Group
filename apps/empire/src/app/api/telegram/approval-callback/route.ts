export const dynamic = 'force-dynamic';

import * as fs from 'fs';
import * as path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import type { ApprovalGate } from '@/lib/personal-intelligence/approval-gate';
import { appendVerifiedPhase1IDecision, createEvidenceSummary, getDecisionState, replaySeenInLedger, resolveApplyRequestByShortId, verifyDecisionCallbackData, type TelegramDecisionErrorCode } from '@/lib/personal-intelligence/phase-1i-decision-ledger';

function jsonError(code: TelegramDecisionErrorCode, status = 400): NextResponse { return NextResponse.json({ ok: false, code }, { status }); }
function config() { const token = process.env.TELEGRAM_BOT_TOKEN; const signingKey = process.env.TELEGRAM_DECISION_SIGNING_KEY; if (!token || !signingKey) throw new Error('ERR_INTERNAL'); return { token, signingKey, gatePath: process.env.PI_APPROVAL_GATE_PATH ?? path.join(process.cwd(), 'docs', 'margot', 'personal-intelligence', 'approval-gate', '2026-05-25-phase-1h-approval-gate-example.json'), ledgerPath: process.env.PI_DECISION_LEDGER_PATH ?? path.join(process.cwd(), 'docs', 'margot', 'personal-intelligence', 'approval-decisions', 'phase-1i-telegram-decisions.jsonl') }; }
async function telegramPost(token: string, method: string, body: Record<string, unknown>): Promise<void> { await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }

export async function POST(req: NextRequest) {
  let cfg: ReturnType<typeof config>; try { cfg = config(); } catch { return jsonError('ERR_INTERNAL', 500); }
  const update = await req.json(); const cb = update.callback_query; const callbackId = cb?.id; const data = cb?.data; const chatId = cb?.message?.chat?.id === undefined ? '' : String(cb.message.chat.id); const userId = cb?.from?.id === undefined ? '' : String(cb.from.id); const messageId = cb?.message?.message_id;
  if (!callbackId || !data || !chatId || !userId || typeof messageId !== 'number') return jsonError('ERR_PARSE');
  const gate = JSON.parse(fs.readFileSync(cfg.gatePath, 'utf8')) as ApprovalGate;
  const verified = verifyDecisionCallbackData({ callbackData: data, context: { chatId, userId }, signingKey: cfg.signingKey, replaySeen: (key: string) => replaySeenInLedger(cfg.ledgerPath, key) });
  if (!verified.ok || !verified.payload) { await telegramPost(cfg.token, 'answerCallbackQuery', { callback_query_id: callbackId, text: verified.code ?? 'ERR_BAD_SIG', show_alert: true }); return jsonError(verified.code ?? 'ERR_BAD_SIG'); }
  let request; try { request = resolveApplyRequestByShortId(gate, verified.payload.applyRequestShortId); } catch { await telegramPost(cfg.token, 'answerCallbackQuery', { callback_query_id: callbackId, text: 'ERR_NOT_FOUND', show_alert: true }); return jsonError('ERR_NOT_FOUND'); }
  if (verified.payload.action === 'view_evidence') { const summary = createEvidenceSummary(gate, verified.payload.applyRequestShortId); await telegramPost(cfg.token, 'answerCallbackQuery', { callback_query_id: callbackId, text: summary.slice(0, 190), show_alert: true }); await telegramPost(cfg.token, 'sendMessage', { chat_id: chatId, text: summary, disable_web_page_preview: true }); return NextResponse.json({ ok: true, action: 'view_evidence', applyRequestId: request.id, resultState: 'info_only' }); }
  try {
    const name = [cb?.from?.first_name, cb?.from?.last_name].filter(Boolean).join(' ').trim() || cb?.from?.username || userId;
    const result = appendVerifiedPhase1IDecision({ gate, ledgerPath: cfg.ledgerPath, applyRequestId: request.id, payload: verified.payload, chatId, messageId, actor: { telegramUserId: userId, ...(cb?.from?.username ? { telegramUsername: cb.from.username } : {}), displayName: name } });
    const state = getDecisionState(cfg.ledgerPath, request.id);
    await telegramPost(cfg.token, 'answerCallbackQuery', { callback_query_id: callbackId, text: result.appended ? state.summary.slice(0, 190) : 'Duplicate click ignored; existing decision kept.', show_alert: false });
    await telegramPost(cfg.token, 'editMessageText', { chat_id: chatId, message_id: messageId, text: `${cb?.message?.text ?? `Phase 1H approval request: ${request.title}`}\n\n${state.summary}\nNo execution side effects.`, disable_web_page_preview: true });
    if (state.isTerminal) await telegramPost(cfg.token, 'editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
    return NextResponse.json({ ok: true, action: verified.payload.action, applyRequestId: request.id, resultState: result.record.resultState, appended: result.appended });
  } catch (error) { const code = error instanceof Error && error.message.startsWith('ERR_') ? error.message as TelegramDecisionErrorCode : 'ERR_INTERNAL'; await telegramPost(cfg.token, 'answerCallbackQuery', { callback_query_id: callbackId, text: code, show_alert: true }); return jsonError(code, code === 'ERR_INTERNAL' ? 500 : 400); }
}
