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
| **PDFs generally** | Six separate PDFs fetched HTTP 200 and returned unreadable binary: ASIC's Corporate Plan (3MB), ICA's CAT report (6.1MB), ICA's AFCA submission, AFCA's July 2025 Approach, the ABCB IAQ handbook, the enHealth mould guidance. No PDF text extractor was available to any sweep. | Install a PDF text extractor before run 2. This single gap cost more entries than any other cause. |
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

1. **A PDF text extractor.** It unblocks six known documents at once.
2. **The AFCA Approach PDF** [AFCA-12]. The single most valuable unread document. It decides
   whether the card's 10 August 2026 date [CARD-07] stands.
3. **Re-run every Safe Work Australia timeout** to harden or break STD-13 and STD-14.
4. **Direct fetches of ABCB, QBCC and state licence-class pages** to strengthen the TRIAL-07
   negative, which is currently search-only for those bodies.
5. **ASIC's approved-codes register** to settle whether the Code is enforceable yet
   [ASIC-03].
