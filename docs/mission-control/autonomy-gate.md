# Autonomy gate — L0–L3 enforcement at the tool-call boundary

**Ticket:** UNI-2409 (`[MC-P1][SECURITY] Enforce L3 approval at the real tool-call permission boundary`)
**Parent:** UNI-2246
**Classifier:** [`apps/workspace/src/server/lanes/autonomy-gate.ts`](../../apps/workspace/src/server/lanes/autonomy-gate.ts)
**Enforcement:** [`apps/workspace/src/server/lanes/autonomy-hook.mjs`](../../apps/workspace/src/server/lanes/autonomy-hook.mjs)
**Wiring:** [`autonomy-settings.ts`](../../apps/workspace/src/server/lanes/autonomy-settings.ts) · [`index.ts`](../../apps/workspace/src/server/lanes/index.ts)

---

## 1. The ladder

| Tier | Meaning | Gate behaviour |
| --- | --- | --- |
| `L0` | read / advise | allow, log |
| `L1` | reversible, single-domain | allow, record evidence |
| `L2` | outward or cross-domain | allow **only** with a verification stamp |
| `L3` | merge, deploy, prod DB, secrets, spend, external publish, destructive | **block** pending founder/Board approval scoped to the exact action |

## 2. The one design decision everything rests on

**This is an allow-list, not a deny-list.**

A deny-list of dangerous commands fails **open**: every command the author did
not think of is permitted, so the list is not a control, it is an inventory of
the attacks someone already knew about. `git push` is easy to block. `g push`
via an alias, `bash deploy.sh`, `xargs git`, `eval "$CMD"`, `PATH=/tmp/evil ls`
and `find . -exec rm {} +` are not.

A command reaches L0/L1 only when **every** executable in it is on a short
known-safe list **and** it contains nothing that could smuggle a second command.
Everything else escalates. Unknown does not mean safe — unknown means "cannot
classify", which is exactly the case the ticket requires to fail closed.

The cost is false escalations: a harmless unrecognised command needs an
approval. That is the correct direction for the error to point.

Consequences that look like omissions and are not:

- `git` is **absent** from the safe list (because of `git push`); only specific
  read-only subcommands pass, and bare `git` is L3.
- `npm`, `find`, `node`, `python` are absent for the same reason.
- `cat` **is** safe — but `cat .env` is L3. The danger is the target, not the verb.
- An L3 marker anywhere wins over a safe first word, so `ls && git push` reports
  "pushes to a remote" rather than being rescued by `ls`.

## 3. Where it runs

`claude --settings <file>` merges additional settings, and a `PreToolUse` hook
declared there runs before every tool call. The contract, taken from a working
hook on this estate rather than from documentation:

```
stdin  : JSON { tool_name, tool_input, ... }
exit 0 : allow
exit 2 : BLOCK — stderr is shown to the model as the reason
```

**Exit 2 is the only code that denies.** Every failure path in the hook ends at
2, and there is exactly one `process.exit(0)`, reached only by an explicit
allow. A hook that crashes with exit 1 lets the tool run — a broken gate becomes
an open one.

The matcher is `.*`. A matcher listing the tools we already distrust is the
deny-list mistake one level up: an MCP tool, a plugin, or anything a CLI upgrade
adds would never reach the classifier, so the gate would be absent for precisely
the tools nobody has vetted.

The hook is `.mjs` importing the `.ts` classifier through Node type stripping —
the pattern `scripts/control-plane-contract.mjs` already uses — so one
classifier serves the gate, its tests and the enforcement path. A hand-copied
second copy in the enforcement path is how a gate and its tests quietly stop
agreeing.

## 4. Approvals

`actionHash` fingerprints tool + adapter + full argument payload with stable key
ordering. An approval for `git push origin feature` cannot be replayed for
`git push origin main --force`, for a different request id, for the same command
on a different adapter, or after it expires.

Approvals are read from an **operator-controlled file**, never from the hook
payload. A tool call that could carry its own approval is a tool call that can
approve itself; a test smuggles one into the payload and asserts it is ignored.

The gate is prepared **per run**, so an approval can never be scoped wider than
one run, and a failure to prepare it **aborts the run**. A lane that proceeds
ungated because setup failed is the fail-open this whole ticket exists to
prevent.

`safeSummary` deliberately omits the arguments: a blocked call is often blocked
*because* it touches credential material, and echoing it into Mission Control
would leak the thing the block was protecting.

## 5. Content vs names — a hole a live probe found

Blocked from `Read`ing a secret file, the model's first proposed workaround was
to **grep** it. `Grep` takes its target as a glob/pattern rather than a path, so
the original path-only check missed it entirely — and grep returns the matching
*lines*, which is exactly the disclosure being prevented.

Every field that can name a file a content-returning tool will read is now
checked (`file_path`, `path`, `glob`, `pattern`, `paths`, …), and tools that
return **content** are distinguished from tools that return **names**:

- `Grep {glob: '**/.env'}` → **L3**. It discloses the lines.
- `Glob {pattern: '**/.env'}` → **L0**. It discloses only that a file exists,
  which is reconnaissance, not disclosure; escalating it would block ordinary
  repo navigation for no gain in protection.

That is a tested decision, not an unexamined gap.

## 6. Evidence

Run on Node 24.19.0.

```bash
cd apps/workspace && npx vitest run   # 1116 passed
cd apps/workspace && npx tsc --noEmit # exit 0
npm run verify:readiness              # exit 0
```

26 of the tests **spawn the real hook as a subprocess and assert the exit code**.
Unit-testing the classifier proves the classifier; only this proves the hook.

### Live, against a real `claude -p --settings …` run

| Case | Result |
| --- | --- |
| `Read a.txt` | hook exited 0; decision recorded `L0 / allowed`; the model returned the contents |
| `Read .env` | **blocked** — the model reported the block using this hook's own stderr text; decision recorded `L3 / blocked` with arguments omitted |
| every bypass the model then proposed (`grep`, `cat`, shell chain, `bash -c`, `node -e`, `Read` again) | all blocked |

### Positive controls

Each mutation was applied and reverted.

| Mutation | Result |
| --- | --- |
| disable metacharacter/chaining detection | 4 tests red |
| unknown executable → L0 (deny-list behaviour) | 1 test red |
| approval ignores the action hash | 2 tests red |
| unknown tool → L0 | 1 test red |

## 7. What is NOT gated

- **Codex.** It does not read Claude Code settings, has its own
  approval/sandbox policy and a different hook contract. It is deliberately not
  given `--settings`: a lane that looks gated but is not is worse than one that
  is honestly ungated.
- **The Hermes gateway adapter.** It does not execute tools locally at all, so
  the tool-call boundary does not apply in the same shape.

Both need their own slice. Neither is claimed as done.
