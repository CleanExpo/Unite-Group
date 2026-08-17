/**
 * Model identity and lineage — what makes two votes INDEPENDENT.
 *
 * WHY THIS EXISTS. Phase 1 counted quorum as "how many distinct model ids
 * reported this finding". That is the wrong question, and it fails in the
 * direction that looks like success:
 *
 *   - `qwen/qwen3.8-27b` and `qwen/qwen3.8-27b:free` are THE SAME MODEL behind
 *     two routing entries. Counting both is not corroboration, it is one model
 *     agreeing with itself — exactly the failure the self-test already guards
 *     against for a single model reporting twice, reintroduced through the
 *     roster instead of through the loop.
 *   - Three `qwen/*` checkpoints share training data, tokeniser and post-training
 *     recipe. They are correlated reviewers. Two of them inventing the same
 *     false finding is far more likely than two unrelated families doing so,
 *     which is the entire premise the quorum rests on.
 *
 * So the swarm asks for agreement across LINEAGES, and the vendor prefix is the
 * best cheap proxy for lineage that an id gives us. It is a proxy, not ground
 * truth — see the caveat on `familyOf`.
 */

/**
 * Strip OpenRouter's routing/variant suffix from a model id.
 *
 * `:free`, `:beta`, `:extended`, `:batch`, `:nitro`, `:floor` and friends select
 * a route, a price tier or a throughput class — not different weights. Treating
 * them as distinct models is how "three independent reviewers" turns out to be
 * one model polled three times.
 */
export function baseModelId(id) {
  return String(id ?? '').trim().toLowerCase().split(':')[0];
}

/**
 * The lineage key for a model id.
 *
 * OpenRouter ids are `vendor/model`, so the vendor prefix groups checkpoints
 * that share a training pedigree: every `qwen/*` is one family, every
 * `meta-llama/*` another.
 *
 * DELIBERATELY CRUDE, and worth stating rather than hiding. It over-groups —
 * a vendor's two unrelated architectures count as one family, costing us a vote
 * we could have had. It also under-groups: a third party serving a fine-tune of
 * someone else's base model gets its own vendor prefix while sharing most of its
 * lineage. Both are wrong, but they are wrong in opposite directions and the
 * over-grouping error is the SAFE one — it makes the quorum harder to satisfy,
 * never easier. A quorum that is accidentally too easy is a quorum that lies.
 */
export function familyOf(id) {
  const base = baseModelId(id);
  const slash = base.indexOf('/');
  return slash > 0 ? base.slice(0, slash) : base;
}

/** How many independent lineages are represented in a set of model ids. */
export function distinctFamilies(ids) {
  return new Set([...ids].map(familyOf)).size;
}

/**
 * Reject a roster that cannot possibly produce independent corroboration.
 *
 * Called before any network request, because discovering that your five
 * reviewers were one model wearing five hats AFTER paying for the run — or
 * worse, after acting on its findings — is the expensive way to learn it.
 *
 * Returns `{ ok, reason, models }` with duplicates collapsed to their base id.
 */
export function validateRoster(models, quorum) {
  // Defensive, and not theoretical: a NaN quorum passes every `<` comparison
  // below (NaN comparisons are always false), so the roster validates and then
  // `votes >= NaN` is false for every cluster — the swarm corroborates nothing
  // and prints a clean review. The CLI now rejects a bad --quorum before
  // reaching here, but this function is exported and must not depend on its
  // only current caller having done that.
  if (!Number.isInteger(quorum) || quorum < 1) {
    return { ok: false, models: [], collapsed: 0, families: 0, reason: `Quorum must be a positive integer; got ${quorum}.` };
  }

  const seen = new Map();
  for (const m of models) {
    const base = baseModelId(m);
    // Keep the first spelling encountered; report the collapse so the operator
    // knows their roster was smaller than it looked.
    if (!seen.has(base)) seen.set(base, m);
  }
  const deduped = [...seen.values()];
  const collapsed = models.length - deduped.length;
  const families = distinctFamilies(deduped);

  if (deduped.length < quorum) {
    return {
      ok: false,
      models: deduped,
      collapsed,
      families,
      reason: `Roster has ${deduped.length} distinct model(s) after collapsing routing variants, but quorum is ${quorum}.`,
    };
  }
  if (families < quorum) {
    return {
      ok: false,
      models: deduped,
      collapsed,
      families,
      reason:
        `Roster spans only ${families} model lineage(s) but quorum is ${quorum}. ` +
        'Agreement between checkpoints from one vendor is correlated, not independent — ' +
        'add a model from a different vendor or lower the quorum knowingly.',
    };
  }
  return { ok: true, models: deduped, collapsed, families };
}
