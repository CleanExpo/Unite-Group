# Verified Claude Fable 5 behaviours

Ground-truth catalogue for the Fable Playbook Generator. Source: Anthropic's
official [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5)
guide. The app-layer authoritative copy is `lib/playbook-catalogue.ts`
(`FABLE_BEHAVIOURS`); this markdown mirrors it for the Cowork/OS layer and for
human reading. Keep the two in sync.

The generator measures *which* of these a baseline model is missing (from your
JSONL sessions) and renders the corrective language into a personalised
`FABLE_PLAYBOOK.md`.

1. **Act when you have enough info.** No over-planning, no re-deriving settled
   facts, no surveying options you won't pursue. Recommend, don't enumerate.
2. **No unrequested tidying.** Simplest thing that works. Validate only at system
   boundaries. No back-compat shims when you can just change the code.
3. **Lead with the outcome.** First sentence is the TLDR. Short by selection, not
   by fragments or arrow chains.
4. **Pause only when genuinely blocked.** Destructive/irreversible action, real
   scope change, or input only the user has. Never end on a promise.
5. **Ground progress claims.** Audit each claim against a tool result before
   reporting. If tests fail, say so with the output.
6. **State the boundaries.** When the user is thinking out loud, deliver the
   assessment and stop. Check evidence before any state-changing command.
7. **Parallel subagents.** Delegate independent subtasks; keep working; intervene
   only on drift. Async over blocking.
8. **Memory system.** One lesson per file, summary on top, corrections *and*
   confirmed approaches, no duplicates, delete what's wrong.
9. **Communication-style addendum.** Terse between tool calls; the final summary
   is a re-grounding for a reader who saw none of the work — outcome first,
   complete sentences, no invented vocabulary.
10. **Send-to-user for long runs.** Surface must-see content verbatim mid-turn;
    never route narration through it.

**Scaffolding:** start at the top of your difficulty range; make
self-verification explicit (fresh-context verifier subagents beat self-critique);
don't tell the model to reproduce its hidden reasoning as response text; refactor
over-prescriptive legacy skills.
