# OpenRouter review swarm

A cheap second opinion. Fans a diff out to several low-cost or free models in
parallel and surfaces only the findings that **more than one model independently
reports**.

Built to reduce how much we lean on one expensive reviewer — not to replace
judgement. It is a filter for attention: it says *look here*, and a human or the
expensive reviewer decides.

## Why corroboration

A single cheap model produces confident nonsense often enough to be useless as a
gate. Two models inventing the *same* false finding about the *same* line is
rare. Requiring a quorum converts unreliable reviewers into a usable signal
without paying for a strong one.

## Prerequisites

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Node 18+. **No dependencies** — built-in `fetch` only.

> Not runnable from the Claude Code remote container: `openrouter.ai:443` is
> denied by that environment's network policy (`gateway answered 403 to
> CONNECT`). Run it on a machine with normal outbound access.

## 1. Benchmark first

Do not pick models by reputation. Measure them against defects that actually
shipped in this repo.

```bash
node scripts/swarm/bench.mjs --list          # what is genuinely zero-cost today
node scripts/swarm/bench.mjs --free          # score every free model
node scripts/swarm/bench.mjs --models a,b,c  # score specific ones
```

Writes `bench-results.json` with every raw response, so a disputed score can be
re-read without paying for the run twice.

### The corpus

`defects.json` holds **8 real defects** from PRs #1005, #1006 and #1009 —
nothing invented. Each carries ground truth verified by the merged fix.

**Five of the eight were missed by Claude and caught only in review.** That is
the point: a second opinion is being hired to catch what the first opinion
misses, so the benchmark is weighted towards exactly those cases.

| Case | Severity | Claude missed |
|---|---|---|
| `prefix-mispricing` — `startsWith` prices unknown models | medium | yes |
| `offset-pagination-no-order` — `.range()` with no `ORDER BY` | high | yes |
| `unawaited-serverless-write` — floating promise lost on freeze | high | yes |
| `test-asserts-less-than-name` — test name claims 3, body passes 2 | medium | yes |
| `summing-without-dedupe` — duplicate rows inflate a summed ledger | medium | yes |
| `cron-star-slash-zero` — `*/0` infinite loop | critical | no |
| `claim-then-finalise-strand` — rows stranded mid-publish | high | no |
| `timestamptz-end-bound` — `lte` drops the final day | medium | no |

Scoring is keyword-based, crude, and transparent by choice. An LLM judge would
score better but costs money and hides its own errors inside a benchmark whose
whole purpose is establishing trust cheaply. Raw responses are always kept.

### What full marks require

The first version of the scorer awarded 1.0 whenever every `mustMention` term
appeared, with no requirement that the answer claim anything. Review on PR #1017
showed the break: simply joining the `mustMention` terms scored full marks on
**8 of 8 cases** — `"end day"` was a perfect answer for the timestamptz boundary
defect. That ranks a model which extracts nouns from the prompt above one that
explains the bug, inverting the benchmark's purpose.

Requiring the anchors **and** a recognised explanation fixed that, and was still
not enough — a second review pass found that this scored 1.0 on 8 of 8 cases too:

> This code has no defect. It mentions *&lt;all anchors&gt;*. The documentation says:
> *&lt;an acceptAny phrase&gt;*. The implementation is correct and should not change.

Every anchor, an accepted explanation, and a verdict that the code is fine. This
is not a contrived risk: the system prompt tells models *"if the code is correct,
say so"*, so denials are routine output. A model that reliably says "looks fine"
while restating the context would have topped the leaderboard.

Getting this right took three attempts, and the first two failed the same way.

1. **A list of literal phrases.** Review broke it immediately with four wordings
   nobody had listed (*"expected behavior, not an error"*, *"requires no
   modification"*, *"I cannot identify a problem"*, *"not problematic"*).
2. **Patterns matching the grammar** of a no-defect verdict — negation on a
   defect noun, inability to find one, assertions of correctness. Better shape,
   still an enumeration: attacking it with 29 plausible denials found **17 still
   leaking** (*"The snippet is bug-free"*, *"Everything checks out"*, *"This
   passes review"*, *"No action is required"*).
3. **Scoring the claim instead of the blob.** The system prompt already mandates
   `DEFECT: … WHY: … FIX: …`. Scoring the DEFECT+WHY payload makes the score
   **non-monotone**: framing wrapped *around* a claim stops counting, because it
   is not part of what the model asserted. `DEFECT: none` scores 0 outright.

Step 3 is what actually closed the family — all 29 framings, including the 17
that leaked. Steps 1–2 survive only as a backstop for replies that ignore the
format, which cheap models often do.

Each case carries two controls: a `negativeControl` (every anchor, no claim at
all) and a `refutationControl` (every anchor, an accepted explanation, an
explicit denial). `selftest.mjs` pins those plus 29 denial framings × 8 cases and
two stuffing attacks below 1.0, while requiring each case's own ground truth to
score exactly 1.0.

### The limit that remains

Stated plainly, because a benchmark that hides its own weakness is worthless.

**Containment scoring is monotone.** Within the payload, adding text can still
only raise a score. Payload scoping bounds *where* that applies; it does not
repeal it. A denial written *inside* the `DEFECT:` line in wording the patterns
miss will still score.

**A verbatim accepted phrase is only weak evidence of cheating.** Reproducing an
`acceptAny` string suggests the answer came from the corpus rather than the code
— models are shown only `context` and `code`, never the answer key. But applying
that unconditionally was worse than the attack: it demoted a genuine, correctly
formatted answer to 0.5, because *"pages can skip or duplicate rows"* is simply
what a competent reviewer writes. The `acceptAny` entries were authored as
natural descriptions, so natural wording is not proof of anything. The rule now
applies only when the reply files no claim at all, where those strings are the
only evidence there is.

**The penalty is a cap at 0.5, not a zero**, throughout. A false positive on a
real finding costs half a mark rather than everything, and all 8 ground truths
are pinned at 1.0 under every rule above.

**Anchors-without-explanation scores 0.5, not 0**, for the same reason:
separating a shallow-but-real finding from a fluent non-claim needs semantics,
which is the LLM judge this benchmark declines to hire. 0.5 is the proven ceiling
for stuffing — a stuffer ranks mid-table, never top.

This is a heuristic screen, not a judge. Treat a ranking as a shortlist and read
`bench-results.json` before acting on it — which is why every raw response is
kept.

## 2. Run the swarm

```bash
node scripts/swarm/swarm.mjs --diff                        # working tree vs HEAD
node scripts/swarm/swarm.mjs --diff --base origin/main     # the whole branch
node scripts/swarm/swarm.mjs --files a.ts b.ts
node scripts/swarm/swarm.mjs --diff --quorum 3             # stricter
```

With no `--models`, the roster is taken from your own `bench-results.json` — top
scorers, zero errors. If you have not benchmarked, it refuses to guess.

Output separates **corroborated** findings (quorum met) from **single-model**
findings (shown, but below the bar). Models that errored are listed explicitly,
because a model that errored did not vote and the effective quorum was lower
than requested.

## 3. Self-test

```bash
node scripts/swarm/selftest.mjs     # 70 assertions, no network, no key
```

Every assertion has a negative control. The scorer must reject four generic
wrong answers for every case; the clusterer must merge paraphrases *and* keep
unrelated findings apart *and* refuse to let one model form its own quorum.

This caught a real bug during development: clustering used Jaccard similarity,
which divides by the union and therefore penalises the wordier of two findings.
Two models describing the same missing-`ORDER BY` defect scored 0.294 against a
0.30 threshold, split into separate clusters, and both fell below quorum — the
corroboration mechanism silently discarding the very thing it exists to find.
Replaced with the overlap coefficient (divide by the smaller set): 0.50 for that
true pair against 0.10 for unrelated findings. Both are pinned as tests.

## Tuning

| Flag | Default | Notes |
|---|---|---|
| `--quorum` | 2 | Models that must agree before a finding is promoted |
| `--concurrency` | 6 | Free tiers rate-limit hard; lower it if you see 429s |
| `--max-chars` | 24000 | Diff chunk size; chunk count is always printed |
| `--timeout` | 120000 | Per-request, ms |
| `--max-models` | 25 | Cap on `--free` roster size |

## Known limits

- **Free tiers are rate-limited and sometimes unavailable.** Errors are reported,
  never swallowed — but they lower the effective quorum, so read the error list.
- **Keyword scoring is approximate.** It rewards a model that names the right
  mechanism. Read `bench-results.json` before acting on a ranking.
- **Clustering is lexical, not semantic.** Two findings using entirely different
  vocabulary for one defect will not merge.
- **Free model quality varies enormously.** That is what the benchmark is for.
  Re-run it periodically; the catalogue changes weekly.
