# Vision — Fable Playbook Generator

Fable 5 was briefly available and then pulled. You can't clone its weights, but
its *behaviour* — the working rhythm, the discipline around tool use, the
plan-before-act cadence — is recoverable. Claude Code conversations live as
JSONL on disk, and every line tags the model that produced it. So: mine your own
sessions, measure how Fable worked versus the model you're stuck with, and
distill the delta into a playbook you inject into any model — Opus, Codex, or an
open-source model — to make it behave more like Fable.

Provenance: Mark Kashef, "Make ANY Model Think Like Fable in Minutes"
(YouTube `B95cu7seTm8`). Corroborated by the public HuggingFace Fable-5 trace
datasets, the `teich` extractor, independent playbook projects (kropdx,
Piebald-AI), and — decisively — Anthropic's own "Prompting Claude Fable 5"
guide, which publishes the exact behaviours the technique reverse-engineers.

**Done when:** a user can run one local command over their `~/.claude` sessions,
paste the result into the app, and get back a `FABLE_PLAYBOOK.md` grounded in
both their measured model-gap and Anthropic's verified behaviour catalogue —
ready to drop into a hook, a skill, or CLAUDE.md.
