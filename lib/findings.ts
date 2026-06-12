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

// Pulls the numbered findings out of a persona critique so the UI can offer
// them as selectable, prioritised items. Lines that carry no recognisable
// priority default to "important" rather than being dropped.
export function parseFindings(critique: string): BoardFinding[] {
  const findings: BoardFinding[] = [];
  for (const line of critique.split("\n")) {
    const tagged = line.match(
      /^\s*\d+[.)]\s*(?:[([]\s*)?(critical|important|nice[- ]to[- ]have)(?:\s*[)\]])?\s*[—:–-]*\s*(.+)$/i,
    );
    if (tagged) {
      const priority = tagged[1].toLowerCase().replace(/\s+/g, "-") as FindingPriority;
      findings.push({ priority, text: tagged[2].trim() });
      continue;
    }
    const plain = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (plain) findings.push({ priority: "important", text: plain[1].trim() });
  }
  return findings.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
