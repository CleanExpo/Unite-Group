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
4. **No claim structure, no full credit.** Step 3 only protects replies that
   *use* the format. For replies that ignore it there is no payload to scope to,
   and review broke the fallback by **doubling one space** inside a quoted
   explanation — every paraphrase word survived, the exact-substring check
   missed, and all 29 framings went back to 1.0 on 8 of 8 cases. Reordering the
   words does the same. So an unformatted reply now caps at 0.5, reported as
   `verdict: 'unformatted'`.
5. **The contract is all three fields, in order, and nothing else.** Step 4
   first required only `DEFECT:`, which made its own justification incoherent —
   a model could omit two mandated fields and still rank as fully compliant.
   Then it required all three but found them with independent searches, so
   `DEFECT: … FIX: … WHY: …` and a duplicate trailing `WHY:` both scored 1.0.
   Then it validated only the labels it found, so a *"Here is my assessment:"*
   preamble and trailing prose after the `FIX:` sentence both scored 1.0 too.
   The parser now reads the reply as one ordered structure: `DEFECT:` must start
   it, the labels must run `DEFECT → WHY → FIX` once each and non-empty, and
   nothing may follow the `FIX:` sentence. `FIX:` is required for compliance but
   excluded from what is scored, so a model cannot earn paraphrase credit from
   its suggested remedy without ever stating what is wrong.

Steps 4–5 are what finally closed the fallback, and it closed it without another
lexical rule. Steps 1–3 still do useful work; step 4 means none of them has to be
complete.

**The cost, stated rather than hidden**: a cheap model that identifies
the defect correctly but wraps it in a chatty preamble, or adds a closing
remark, is capped at 0.5 and ranks below one that answers in the exact format.
That is a real penalty, and a strict one. It is the right direction of error —
this benchmark exists to decide whether cheap models can be *trusted*, so it
should understate rather than overstate them — and format compliance is
load-bearing downstream anyway, since `swarm.mjs` parses structured JSON
findings. A model that cannot follow an output contract is genuinely less useful
here, not merely differently styled.

### What the contract does *not* enforce

The prompt asks for one sentence in `DEFECT:` and `FIX:` and at most two in
`WHY:`. That is **brevity guidance, not a validated constraint**, and the prompt
is worded so it does not claim otherwise. An over-long field scores normally, and
`selftest.mjs` pins that as an accepted outcome so it stays a recorded decision
rather than a gap nobody noticed.

Enforcing it would be worse, on two counts that are measured rather than assumed:

- **The corpus would fail its own contract.** Every `groundTruth` in
  `defects.json` is 2–4 sentences of documentation prose. A one-sentence
  `DEFECT:` rule makes the reference answers unable to score full marks against
  their own benchmark.
- **Segmentation is unreliable on this content.** Splitting on `[.!?]\s` counts
  *"Rows land in the same ms. e.g. a cron burst. So id breaks ties."* as four
  sentences rather than three, and this corpus is full of abbreviations,
  decimals (`$1.25`) and dotted identifiers. A miscounting format check
  penalises **correct** answers — the same failure direction that made the
  contamination rule wrong.

**Open question, to settle with data rather than guesswork.** Nobody has yet run
this against live models (`openrouter.ai` is unreachable from the container it
was written in), so how many real replies are chatty is unmeasured. If a whole
field lands on 0.5, the `UNFMT` column says so explicitly and the bar can be
revisited *then* — loosening a stated contract now, on speculation about model
behaviour, would be guessing in the direction that flatters the tool.

Each case carries two controls: a `negativeControl` (every anchor, no claim at
all) and a `refutationControl` (every anchor, an accepted explanation, an
explicit denial). `selftest.mjs` pins those plus 29 denial framings × 8 cases ×
3 evasions and two stuffing attacks below 1.0, while requiring each case's own
ground truth — scored through the mandated format — to score exactly 1.0.

> The evasions matter. An earlier version of that sweep used only the verbatim
> accepted phrase, which meant the exact-substring check was doing all the work:
> the loop passed while proving nothing about the fallback path. A test that
> passes for a reason other than the one in its name is precisely the defect this
> file exists to prevent, so whitespace-altered and word-reordered variants are
> now first-class controls.

### The limit that remains

Stated plainly, because a benchmark that hides its own weakness is worthless.

**Containment scoring is monotone.** Within the payload, adding text can still
only raise a score. Payload scoping bounds *where* that applies; it does not
repeal it. A denial written *inside* the `DEFECT:` line in wording the patterns
miss will still score — that is the one remaining route to an undeserved 1.0,
and it requires the model to file a formal defect claim and then contradict it
inside the claim itself.

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
node scripts/swarm/swarm.mjs --diff --roles defect         # phase 1 behaviour
node scripts/swarm/swarm.mjs --diff --no-refute            # skip stage two
```

With no `--models`, the roster is taken from your own `bench-results.json` — top
scorers, zero errors. If you have not benchmarked, it refuses to guess.

### Three roles, not five copies of one reviewer

Phase 1 sent every model the same prompt, so a five-model swarm was five draws
from one distribution. Redundancy raises confidence in what the prompt already
looks for and cannot find what it never thought to ask. The roles fail
differently, which is the point:

| Role | Job | Prompted to |
|---|---|---|
| `defect` | double-check | find bugs it can point at in the diff |
| `weakness` | attack | assume the happy path is fine, find the input/timing/scale that breaks it anyway |
| `question` | surface unknowns | ask what the change assumes without saying, and never assert |

**Questions never count towards quorum.** They ride the same schema
(`severity: "question"`) so the clusterer dedupes them, but they are listed in
their own section. Counting them as votes would let uncertainty masquerade as
consensus.

### Quorum counts LINEAGES, not model ids

This is the correctness fix that matters most. Phase 1 counted distinct model
ids, so a roster of `qwen/a`, `qwen/a:free`, `qwen/a:nitro` looked like three
independent reviewers and was **one model polled three times** — the exact
failure the self-test already guarded against inside the loop, reintroduced
through the roster.

- Routing/price/throughput suffixes (`:free`, `:nitro`, `:batch`, …) select a
  route, not different weights, so they collapse to one model.
- Checkpoints sharing a vendor prefix share training data and post-training
  recipe. They are **correlated** reviewers; two of them inventing the same false
  finding is far likelier than two unrelated families doing so.

A roster that cannot produce independent agreement is rejected **before any
request**, because learning it after acting on the agreement is the expensive
way. The vendor prefix is a crude proxy — it over-groups a vendor's unrelated
architectures and under-groups third-party fine-tunes — but it errs towards
making the quorum *harder*, and a quorum that is accidentally too easy is a
quorum that lies.

### Stage two: refutation

Corroboration alone still lets two cheap models agree on nonsense. Every
corroborated finding is challenged by up to `--refuters` models **from lineages
that did not raise it**, prompted to refute rather than to assess and told to
default to refuted when unsure. A majority — or a tie — drops the finding.

If no challenger returns a parseable verdict the finding **survives**:
refutation is a filter bolted onto corroboration, and a filter that cannot run
must not silently delete what it cannot judge.

### Free tiers 429 hard

"Run free models in parallel" is mostly a rate-limit engineering problem. Phase 1
turned any non-2xx into an error, so a rate-limited model simply didn't vote and
the **effective quorum silently dropped below the requested one**. Calls now
retry with exponential backoff and full jitter, honouring `Retry-After` when the
server sends one (capped, so one sulking model cannot stall the run). Jitter
matters: without it a synchronised fan-out retries in lockstep and every model
burns its quota against every other.

A `400` is never retried — retrying a bad request just burns quota.

### The cost ledger

The whole programme is about spend, so the run ends by proving it was free. Cost
is read from the **provider's** reported usage, not computed from our own price
table: a benchmark that prices calls from its own assumptions cannot notice the
case it exists to catch — a model that was free when the roster was chosen and
is not free today. Any model that billed is **named**, not buried in a total.

Output separates **corroborated** findings (quorum met, refutation survived)
from **single-lineage** findings (shown, below the bar) and **questions**. Models
that errored are listed explicitly, because a model that errored did not vote.

## 3. Self-test

```bash
node scripts/swarm/selftest.mjs     # 181 assertions, no network, no key
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
| `--quorum` | 2 | Independent **lineages** that must agree before a finding is promoted |
| `--roles` | defect,weakness,question | Which review lenses to run |
| `--refuters` | 3 | Challengers per corroborated finding (`--no-refute` to skip) |
| `--attempts` | 4 | Tries per call before giving up on a rate-limited model |
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
