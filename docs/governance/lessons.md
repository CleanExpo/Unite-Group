# lessons.md — method learning for UNI-2673

Appended at every run exit. Which sources were rich, which were dead, which query shapes
worked per body. The point is that each run costs less than the last.

---

## Run 1 — 2026-09-07

Seven parallel sweeps (TRIAL, ICA, ASIC, AFCA, LOSS, NCC, STD) on Sonnet, coordinator on
Opus, two fresh-context verifiers. 88 ledger entries produced.

### Rich sources — go straight here next time

| Body | What worked | Ledger |
| --- | --- | --- |
| **ICA** | `insurancecouncil.com.au/code-of-practice/code-submissions/` is the single densest page in the program. It carries the enforceability claim, the consultation dates, the Expert Report Standard obligation, and the full submission list. Four entries from one page. | ICA-01, ICA-02, ICA-04, ICA-07 |
| **ICA data** | `/resource/hail-events-push-extreme-weather-costs-to-4-8-billion-in-2025/` carried all four seed numbers plus a fifth nobody asked for. `/news-hub/current-catastrophes/significant-events/` is a live per-event register. | LOSS-01 to LOSS-11 |
| **Treasury** | Media-release communiques are far more quotable than policy pages. `consult.treasury.gov.au/c2025-<id>` states window status plainly. | NCC-01, NCC-05, NCC-06 |
| **Master Builders** | Their submission PDFs are text-extractable and directly quotable. Rare among PDFs in this domain. | NCC-02, NCC-03, NCC-04 |
| **ASIC** | Media releases (`NN-NNNmr-slug`) and regulatory guides (`rg-NNN-slug`) both fetch cleanly and quote well. Six clean entries. | ASIC-01 to ASIC-08 |
| **legislation.gov.au** | Fetched cleanly for the WHS Act. Underused this run. | STD-05 |
| **Consumer Action** | `consumeraction.org.au` carries coalition positions with member lists attached. | ICA-05 |

### Dead ends — do not spend budget here again without a new tool

| Source | Failure | Fix for run 2 |
| --- | --- | --- |
| **afca.org.au** | Cloudflare 403 on nearly everything: direct fetch, `r.jina.ai` proxy, and the Exa crawler all blocked. Only two pages loaded, both via proxy. The finalised Approach PDF never loaded at all. | This is the program's biggest hole. It needs a real browser session, not a fetch tool. |
| **PDFs generally** | Six separate PDFs fetched HTTP 200 and returned unreadable binary: ASIC's Corporate Plan (3MB), ICA's CAT report (6.1MB), ICA's AFCA submission, AFCA's July 2025 Approach, the ABCB IAQ handbook, the enHealth mould guidance. Three sweeps reported that no PDF text extractor was available. **That report was FALSE.** A direct check on this machine found `pdftotext` at `/mingw64/bin/pdftotext`, plus `pypdf` 6.16.2 and `pymupdf`. Verifier B used `pdftotext -layout` successfully to extract a 20-page, 959-line AFCA document. | **Tell every sweep the extractor exists and name the command.** The sweeps did not check; they assumed. This one false negative cost six primary documents and was nearly written into run 2's plan as a purchase. |
| **safeworkaustralia.gov.au** | Fetches timed out repeatedly at 60s. Three of the four checks behind the headline STD-14 vacuum claim are timeouts, not reads. | Retry with longer timeouts. Until then STD-13 and STD-14 stay provisional. |
| **standards.org.au catalogue** | A JavaScript-rendered app. A direct fetch of the S500 page returned an unrelated cached standard about pruning trees. | Needs a browser. Library catalogue records (`collection.sl.nsw.gov.au`) proved a usable fallback for confirming a standard exists. |
| **Guessed URL patterns** | Two 404s from constructed URLs: a Treasury filtered-consultation query and a Queensland legislation ID. Both produced weak negatives. | Never construct a URL to prove an absence. Navigate to the index. |
| **`asic.gov.au` code-of-practice page** | 404 on the guessed path. Code approval status never confirmed from ASIC. | Find ASIC's approved-codes register by navigation. |

### Query shapes that worked

- **Body's own site first, search engine second.** Every clean entry came from a page
  fetched directly on the body's domain. WebSearch is US-biased and was useful only for
  discovering URLs, never as evidence.
- **Media releases beat policy pages** for quotable sentences at ASIC, Treasury and ICA.
- **Ask for a verbatim quote in the fetch prompt.** The ICA sweep re-fetched the same page
  asking specifically for verbatim text and got a stronger quote the second time.
- **Give the sweep the seed URL when you have one.** The two card attachments both produced
  entries on the first call.

### Which model to use for which job — measured, with the confound named

Run 1 used Sonnet for all seven collection sweeps and for verifier A, and Opus for the
coordinator and verifier B. Measured outcomes:

| Agent | Model | Result | Tool calls | Wall time |
| --- | --- | --- | --- | --- |
| Verifier A | Sonnet | 10 PASS, 0 FAIL, 0 UNRESOLVED | 8 | 142s |
| Verifier B | Opus | 5 PASS, **2 FAIL**, 1 UNRESOLVED | 32 | 487s |

**The confound, stated first.** The two slices were not equally hard. A got clean HTML
pages (ICA, ASIC media releases). B got PDFs behind Cloudflare, a JS-rendered Converlens
app, and a legislation site that 403s. B's harsher result may be slice difficulty, not
model quality. This is not a controlled comparison and must not be quoted as one.

**What is not confounded.** Both of B's FAILs were quotes a *Sonnet sweep* had self-marked
`verified`:

- `STD-05` — the sweep's "quote" of WHS Act s19(1) was a paraphrase. It inserted the
  abbreviation "PCBU", which does not appear in s19, and dropped "is" from "so far as is
  reasonably practicable".
- `NCC-05` — the sweep quoted "This consultation is now closed". The page says "This
  consultation is closed".

Verifier A, on a Sonnet-collected slice, found a real error too (`ICA-08`'s count was
"roughly 23"; the true figure is 31 cards / 24 organisations / 5 individuals) but graded it
PASS-with-correction rather than FAIL.

**Read:** Sonnet collects broadly and cheaply, and grades leniently. Opus grades harshly
and escalates its tooling when blocked — B is the only agent in the run that reached for a
browser when a fetch failed. Neither observation justifies changing the collection model.

**Standing split for run 2:** Sonnet collects, Opus verifies. Same as run 1. The failure
modes that actually cost run 1 evidence were sub-agent report truncation and an unchecked
assumption about local tooling. Neither is fixed by a better model.

**The clean test run 2 should run:** give two agents on different models the *same* slice
of already-collected entries and compare FAIL counts. Until that is run, the table above is
suggestive and nothing more.

### Harness lessons, not research lessons

1. **Sub-agent reports get truncated in transit.** Two of seven sweeps arrived cut: AFCA
   lost entries 01-08, STD lost everything but one fragment. Both were fully recovered by
   sending the agent a message asking it to re-emit a named range with no new searches.
   **Ask for entries in blocks of eight.** A sixteen-entry report will not survive.
2. **Bash heredocs are unusable on this box.** Writing a Python file with `<<'PY'` failed
   with an unmatched-quote parse error. Use the Write tool for any file with quoting.
3. **`git worktree add` on this repo exceeds 120 seconds** and gets backgrounded. Start it
   early and do other work while it runs.
4. **Dispatch sweeps before building the substrate.** Seven sweeps ran while the ledger
   tooling was being written. That overlap is most of this run's throughput.

### What run 2 takes first

1. **Use the PDF extractor that is already installed.** `pdftotext -layout` at
   `/mingw64/bin/pdftotext`, plus `pypdf` 6.16.2 and `pymupdf`. Six documents were written
   off as unreadable by sweeps that never ran `command -v pdftotext`. Put the command in
   the sweep prompt.
2. ~~The AFCA Approach PDF~~ **DONE in run 1.** Retrieved by verifier B: load AFCA's page in
   a real browser (Playwright), then `fetch()` the PDF same-origin from inside that page
   context, base64 out, decode, `pdftotext -layout`. 283,014 bytes, 20 pages. This recipe
   defeats Cloudflare for any origin whose HTML page you can load. New entries AFCA-13 to
   AFCA-16.
3. **Re-run every Safe Work Australia timeout** to harden or break STD-13 and STD-14.
4. **Direct fetches of ABCB, QBCC and state licence-class pages** to strengthen the TRIAL-07
   negative, which is currently search-only for those bodies.
5. **ASIC's approved-codes register** to settle whether the Code is enforceable yet
   [ASIC-03].


---

## Run 2, slice 1 - the deep-research lane (2026-09-07)

Scope: only the two items run 1 marked BLOCKING. Model `perplexity/sonar-deep-research` via
OpenRouter, on founder instruction and a $25 credit. Full write-up in `run2-deep-research.md`.

### What the run 1 timeouts actually were

Nothing was wrong with the sources. All five documents that had failed four times downloaded
first try, largest 6,595,488 bytes, using plain `curl` with `--max-time 300`. The run 1 failures
were a fetch-tool problem misread as evidence about the world. **A timeout tells you about your
instrument. Run 1 spent its headline finding on four of them.**

### The rule that held

The two-reader rule survived contact with a very persuasive model. `sonar-deep-research` produced
70 real citations across two queries and every quote it offered matched the primary document when
checked. It was still treated as a locator, never a witness: six entries reached `verified` only
because the coordinating context downloaded the PDF and matched the words itself. Three entries it
reported alone stayed lead-grade and say so (`STD-21`, `ASIC-11`). One clean run does not retire
the rule that run 1 needed, when two Sonnet sweeps fabricated quotes and self-certified them.

### Positive controls, twice, and they earned it

Before trusting a zero, the search was proven able to return a hit. In the Workplace Exposure
Standards list, Benzene returned 30 hits and Formaldehyde 2 before mould, fungi, spore and
bioaerosol returned 0. In the AFCA submission, the word *code* returned 87 hits before the
specific sentence was searched for. Neither negative would have been worth writing down without
them.

### A heavy prompt is a failure mode

The first Q2 prompt asked for five bodies with strict per-body reporting and returned HTTP 504,
*Provider timed out after 300686ms*. Re-running with streaming gave the identical 301-second
failure, which killed the gateway-idle theory rather than confirming it. A narrowed five-question
prompt then ran 514 seconds and returned 50 citations. **Ask for less and you get an answer.**
Neither failed call was charged.

### Cost, measured

$1.2222 for Q1, $1.0975 for the narrowed Q2, $2.3197 total against a $25 credit. About $1.15 a
query. Run 1's recommendation against buying credits was reasonable on run 1's evidence; on run 2's
it was wrong for this specific job, because the bottleneck really was source access.

### Carried into run 3

1. **66 of 102 entries are still `unverified-seed`.** D8 is barely started.
2. **Six state and territory WHS regulators, and every state tenancy instrument except
   Queensland, have been read by nobody in either run.** `STD-14` stays a seed until they are.
3. **`ASIC-03` is settled on the evidence but stays `conflict`.** Rule D6 reserves that to Phill.
   It is a one-line decision, not a research task.
4. **`ASIC-11`'s dates decide the whole positioning window** - lodgement late 2026, effect 2028 -
   and they are trade-press, one reader. Confirm against ICA or ASIC before they are used.

### The independent review found a defect neither run had seen

The release gate sent commit `671fcfc5` to an independent reviewer. Codex was out of quota
and the Cursor lane returned a FAIL naming no blocker, which the runner correctly rejected as
not a review. Gemini produced a real report: **FAIL, four P0 findings**, and it was right.

**The finding.** The memos cite the ledger as though every entry were established fact. Three
findings named single lines; a count then showed the real size: **53 of 69 citations across
the three memos point at entries the ledger does not hold as `verified`.** One of them,
`AFCA-04`, carries the note *Needs a direct read before quotation in any deliverable* - and a
memo is a deliverable. The fourth finding was `STD-14` stating an absolute absence while its
own `search_set` admitted the search was not exhaustive.

**Why this is the same disease one level up.** The whole point of the ledger is that an
unproven claim is labelled unproven. That discipline stopped at the ledger boundary. Once a
fact moved into a memo it lost its grade, and a memo is the thing a human actually reads.

**What was done, and why not the obvious thing.** The obvious fix was to edit the three lines
the reviewer named. That would have been the spellings-not-actions failure: 50 more instances
of the same defect would have survived, all green. Instead the class was closed with
`citations.py`, which makes the grade visible at every citation and **fails when a grade
disagrees with the ledger, in both directions** - a bare citation of an unverified entry, and
a grade left behind after an entry is promoted. The second direction matters more over time,
because promotion is the normal event and stale annotation is the drift that follows it.

**Control pair, on the real documents rather than a fixture.** 53 violations before
annotation, exit 1. 0 after, exit 0. Then a stale grade planted on a verified citation: 1
violation, exit 1. Restored: 0, exit 0.

**`STD-14`'s claim was reworded and the original preserved verbatim in its note.** Rule 3 says
a correction sits beside the original, never over it. The reworded claim is bounded by its
search set, which is what every negative in this ledger actually is.

**The reviewer earned its place.** Run 1 recorded that a gate which only ever catches other
people is not evidence. This is the first finding in the program that came from outside the
agent that wrote the work, and it found a defect that two internal passes had walked past.
