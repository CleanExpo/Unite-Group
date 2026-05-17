---
type: research
updated: 2026-05-17
---

# Agent Cockpit Current Research - 2026-05-17

Purpose: record live internet-backed research for building the Unite-Group Agent Cockpit / CEO Control Panel without relying on stale model memory.

## Executive conclusion

This is not a "can't" problem. It is a control-surface problem.

The system can use browser automation, computer-use, shell tools, Hermes, Claude Code, Codex, OpenRouter, 1Password, Plaud, and local scripts. The production-grade path is not raw typing into existing Terminal windows. The production-grade path is a managed cockpit: named sessions, bounded prompts, logs, evidence, approval gates, and CRM-first persistence.

Recommended build path:
1. Build the local Pi-CEO `agentctl` control layer first.
2. Use managed sessions via `tmux`; keep `screen` as emergency fallback.
3. Mirror task state into Unite-Group CRM once the local control layer is proven.
4. Keep Hermes for long-running goals, Kanban, cron, update scout, and governance.
5. Keep Codex Max for architecture, final review, and high-risk code.
6. Use Claude Max lanes for implementation sessions where already available.
7. Use OpenRouter/Qwen for low-cost research, summaries, UI critique, and log compression.
8. Use OpenAI transcription for Plaud voice intake first; evaluate Qwen or other ASR only after a current model page and cost page are verified.

## Latest verified capabilities

### Hermes Agent

Current local install:
- `Hermes Agent v0.14.0 (2026.5.16)`
- Local path: `/Users/phill-mac/.hermes/hermes-agent`
- `hermes version` reports up to date.

Verified current docs:
- Hermes Kanban is a durable multi-agent board with CLI, slash-command, tool, and dashboard surfaces.
- Hermes cron supports recurring and one-shot jobs, including no-agent script mode for low-cost mechanical work.
- Hermes Codex App Server runtime supports `/goal`, Kanban, and cron workflows, with goal state persisted by session.

Use in this system:
- Long-running thorough tasks.
- Daily update scout.
- Portfolio RYG reporting.
- Kanban and task orchestration.
- Governance review, not fast build execution.

### OpenAI Codex

Verified current OpenAI sources:
- Codex app is designed as a command center for multiple agents, parallel work, worktrees, reviewable diffs, and long-running tasks.
- Codex is included with ChatGPT plans across app, CLI, IDE, and cloud surfaces, subject to plan/workspace controls.
- OpenAI's safety guidance emphasizes boundaries, approvals, telemetry, and clear governance for agents that run commands and interact with development tools.

Use in this system:
- Main build IDE for architecture and high-risk implementation.
- Final review and security-sensitive decisions.
- Managed multi-agent work in Codex Desktop where it fits better than Hermes.

### Claude Code

Current local install:
- `claude 2.1.143`

Verified current Anthropic docs:
- Claude Code supports hooks including `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact`, `SessionStart`, and `SessionEnd`.
- Hooks can block or shape behaviour using exit codes and structured JSON.
- Claude Code can be installed/updated through npm or native package channels.

Use in this system:
- Fast implementation workers.
- Repo-specific build/test loops.
- Hook-driven QA and approval gates.

### OpenRouter / Qwen

Verified OpenRouter source:
- Qwen3.6 Flash is listed with a 1M context window and multimodal input support.
- Qwen3.6 35B A3B is listed as an open-weight multimodal model with 35B total parameters, 3B active parameters, structured output, function calling, and large context.

Use in this system:
- Cheap research workers.
- Log compression.
- UI/UX critique.
- First-pass summaries before Codex Max or Claude Max review.

Guardrail:
- Qwen should not make final production/security/credential decisions. It supplies drafts and evidence summaries.

### Plaud / voice intake

Verified OpenAI audio docs:
- Speech-to-text supports `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe-diarize`, and `whisper-1`.
- Streaming transcription is supported for current transcribe models; `whisper-1` does not support streamed transcription.
- Current OpenAI listed estimated transcription costs:
  - `gpt-4o-transcribe`: about USD $0.006/minute.
  - `gpt-4o-mini-transcribe`: about USD $0.003/minute.

Use in this system:
- Plaud NotePin S recordings become transcripts.
- Margot turns transcripts into structured briefs.
- Unite-Group CRM receives the task record first.
- Synthex receives the work only if the classifier says it is marketing/campaign work.

Cost note:
- Voice intake is not the expensive part. Even one hour of transcription is low single-digit dollars depending on model choice.

### 1Password

Current local install:
- `op 2.33.1`

Verified 1Password docs:
- `op run` loads secrets only into a subprocess environment for the duration of that command.
- Secret references use `op://vault/item/field`.
- 1Password recommends scoped service accounts so automation only sees the secrets required for that job.

Use in this system:
- Secrets stay in 1Password.
- Agent prompts, logs, screenshots, and reports must not contain secret values.
- Cockpit scripts should use `op run` or equivalent scoped injection at execution time.

### Terminal/session control

Current local status:
- `tmux 3.6a` is installed at `/opt/homebrew/bin/tmux`.
- `/usr/bin/screen` also exists as a fallback.

Verified tmux source:
- tmux current release page lists `tmux 3.6`.

Decision:
- Safe managed-session control is recommended.
- Raw Terminal UI typing via Accessibility/computer-use is possible in principle, but it is brittle and hard to audit.
- v0 should use `tmux` as the primary managed-session backend.
- `screen` remains an emergency fallback only.

Cost:
- `tmux` is free.
- Any cost is engineering time, not subscription spend.

## Build recommendation

Build `Agent Cockpit v0` in Pi-CEO first, then surface it inside Unite-Group CRM.

Minimum v0:
- Agent registry: name, provider, cwd, backend, task, status, risk, approval requirement.
- Control commands: list, start, tail, send, pause, stop, snapshot.
- Evidence ledger: every action writes JSONL.
- Prompt policy: bounded nudges only, no raw secrets, no broad prompt without task reference.
- CRM-first packet: local fallback if CRM/Linear auth is down.
- Plaud packet: transcript -> Margot brief -> CRM task -> Kanban task.
- RYG dashboard: active agents, blocked agents, approvals, evidence, Hermes update scout.

Approval gates:
- Phill approves production deploys, spend, publishing, credential changes, endpoint changes, and strategic pivots.
- Board/Margot can review and recommend, but not override those gates.

## Cost stance

No new paid subscription is required to start v0.

Likely small costs:
- OpenAI transcription for Plaud notes: about USD $0.003-$0.006/minute depending on model.
- OpenRouter/Qwen worker calls: low-cost per token, should be capped per task.
- Optional hosted sandbox/remote browser services later, only if local control is insufficient.

No automatic spending:
- No ad spend.
- No paid API spikes.
- No production deploys.
- No credential access expansion.

## Sources

- Hermes Kanban: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
- Hermes Cron: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron/
- Hermes Codex App Server Runtime: https://hermes-agent.nousresearch.com/docs/user-guide/features/codex-app-server-runtime
- OpenAI Codex app: https://openai.com/index/introducing-the-codex-app/
- OpenAI Codex with ChatGPT plan: https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- OpenAI Codex safety: https://openai.com/index/running-codex-safely/
- Anthropic Claude Code hooks: https://code.claude.com/docs/en/hooks
- Anthropic Claude Code setup: https://code.claude.com/docs/en/setup
- OpenAI speech-to-text: https://developers.openai.com/api/docs/guides/speech-to-text
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- 1Password `op run`: https://www.1password.dev/cli/reference/commands/run
- tmux releases: https://github.com/tmux/tmux/releases
- OpenRouter Qwen: https://openrouter.ai/qwen/
