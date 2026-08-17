#!/usr/bin/env bash
# scripts/check-canonical-naming.sh
#
# Fails when lines newly added between <base-ref> and <head-ref> reintroduce
# a retired product identity into active content.
#
# Retired identity covered: the CRM's pre-convergence name (five letters,
# "unite", plus "hub", any separator). Matched case- and separator-insensitively
# so "UNITE_HUB", "unite hub" and "UniteHub" are caught alongside the exact
# original casing the first version of this guard only matched literally.
#
# Scope, not wording, decides what counts as historical: any line under
# docs/legacy/** or CHANGELOG.md is exempt, matching this repo's own
# convention for where lineage material belongs (SOURCE-OF-TRUTH.md). There
# is deliberately no word-adjacency exemption (e.g. a line that merely
# contains "legacy" or "former") — an early draft tried that and a "Route
# requests to UNITE_HUB for legacy support." test case sailed straight
# through on the unrelated word "legacy". A phrase heuristic is gameable by
# construction; a path is not. Active docs that need to describe the retired
# product historically already do it without the literal name (see
# CLAUDE.md's "the former standalone CRM repository") — that periphrasis is
# the correct way to reference it outside docs/legacy/**, not a marker word.
#
# Usage: check-canonical-naming.sh <base-ref> <head-ref>
set -euo pipefail

base_ref="${1:?usage: check-canonical-naming.sh <base-ref> <head-ref>}"
head_ref="${2:?usage: check-canonical-naming.sh <base-ref> <head-ref>}"

# Bracket-expression split so this literal never appears as a contiguous
# "unite...hub" token that the pattern below would match against its own
# source — a self-match would otherwise brick every future edit to this file.
retired_term_pattern='[Uu][Nn][Ii][Tt][Ee][[:space:]_-]?[Hh][Uu][Bb]'

added_lines="$(git diff --unified=0 "${base_ref}...${head_ref}" -- . \
  ':(exclude)docs/legacy/**' \
  ':(exclude)CHANGELOG.md' \
  ':(exclude)**/CHANGELOG.md' \
  ':(exclude).github/workflows/canonical-naming.yml' \
  ':(exclude)scripts/check-canonical-naming.sh' \
  ':(exclude)scripts/__tests__/canonical-naming.test.mjs' \
  | grep -E '^\+[^+]' || true)"

violations="$(printf '%s\n' "$added_lines" | grep -E "$retired_term_pattern" || true)"
violations="$(printf '%s\n' "$violations" | grep -v '^$' || true)"

if [ -n "$violations" ]; then
  echo "Retired product naming detected in newly-added active content:"
  printf '%s\n' "$violations"
  echo
  echo "Use the canonical current identity: Unite-Group."
  echo "For a genuine historical/lineage reference, describe it without the"
  echo "literal name (see CLAUDE.md's 'the former standalone CRM repository')"
  echo "or move the content under docs/legacy/."
  exit 1
fi

echo "Canonical naming guard passed."
