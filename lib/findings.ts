// Pure parsing of board persona critiques — kept free of node imports so the
// client bundle can use it when re-loading board responses from the library.

export type FindingPriority = "critical" | "important" | "nice-to-have";

export interface BoardFinding {
  priority: FindingPriority;
  text: string;
}

const PRIORITY_ORDER: Record<FindingPriority, number> = {
  critical: 0,
  important: 1,
  "nice-to-have": 2,
};

const MAX_FINDINGS = 8;

// Reasoning models sometimes leak their scratchpad into the numbered list.
const META_LINE = /^(i need|i'd need|i should|let me|i will|checking|looking at|this is a critical finding\b)/i;

const WORD = /[a-z][a-z0-9-]{2,}/g;

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().match(WORD) ?? []);
}

// Near-duplicate test: high word overlap with an already-kept finding.
function isDuplicate(text: string, kept: Set<string>[]): boolean {
  const candidate = tokens(text);
  if (candidate.size === 0) return true;
  for (const existing of kept) {
    let shared = 0;
    for (const word of candidate) if (existing.has(word)) shared++;
    if (shared / Math.min(candidate.size, existing.size) > 0.6) return true;
  }
  return false;
}

// Pulls the numbered findings out of a persona critique so the UI can offer
// them as selectable, prioritised items. Lines that carry no recognisable
// priority default to "important" rather than being dropped; scratchpad
// leakage and near-duplicates are removed, and the list is capped.
export function parseFindings(critique: string): BoardFinding[] {
  const raw: BoardFinding[] = [];
  for (const line of critique.split("\n")) {
    const tagged = line.match(
      /^\s*\d+[.)]\s*(?:[([]\s*)?(?:\*\*)?(critical|important|nice[- ]to[- ]have)(?:\*\*)?(?:\s*[)\]])?\s*[—:–-]*\s*(.+)$/i,
    );
    if (tagged) {
      const priority = tagged[1].toLowerCase().replace(/\s+/g, "-") as FindingPriority;
      raw.push({ priority, text: tagged[2].trim() });
      continue;
    }
    const plain = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (plain) {
      const text = plain[1].trim();
      // a leading bold "**critical** — ..." inside an untagged line
      const inline = text.match(/^\*\*(critical|important|nice[- ]to[- ]have)\*\*\s*[—:–-]*\s*(.+)$/i);
      if (inline) {
        raw.push({
          priority: inline[1].toLowerCase().replace(/\s+/g, "-") as FindingPriority,
          text: inline[2].trim(),
        });
      } else {
        raw.push({ priority: "important", text });
      }
    }
  }

  const sorted = raw.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const kept: BoardFinding[] = [];
  const keptTokens: Set<string>[] = [];
  for (const finding of sorted) {
    if (META_LINE.test(finding.text)) continue;
    if (isDuplicate(finding.text, keptTokens)) continue;
    kept.push(finding);
    keptTokens.push(tokens(finding.text));
    if (kept.length >= MAX_FINDINGS) break;
  }
  return kept;
}
