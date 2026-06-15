// The Evidence Ledger: pull every tagged claim out of a generated spec so it
// can be stored in the findings table and surfaced as an assumption register
// — the Evidence Standard made queryable instead of decorative.

export type EvidenceTag = "verified" | "inference" | "unconfirmed";

export interface Claim {
  claim: string;
  tag: EvidenceTag;
  sourceUrl: string | null;
}

export interface EvidenceSummary {
  verified: number;
  inference: number;
  unconfirmed: number;
}

const TAG_RE = /\[(VERIFIED|INFERENCE|UNCONFIRMED)\]/i;
const MAX_CLAIMS = 200;
const MAX_CLAIM_CHARS = 500;

export function extractClaims(spec: string): Claim[] {
  const claims: Claim[] = [];
  for (const raw of spec.split("\n")) {
    const line = raw.trim();
    const match = line.match(TAG_RE);
    if (!match) continue;
    const tag = match[1].toLowerCase() as EvidenceTag;
    const claim = line
      .replace(/^[-*+>•\d.)\s]+/, "")
      .trim()
      .slice(0, MAX_CLAIM_CHARS);
    if (!claim) continue;
    const url = line.match(/https?:\/\/[^\s)\]"']+/)?.[0] ?? null;
    claims.push({ claim, tag, sourceUrl: url?.replace(/[.,;]+$/, "") ?? null });
    if (claims.length >= MAX_CLAIMS) break;
  }
  return claims;
}

export function summarizeEvidence(claims: Claim[]): EvidenceSummary {
  return {
    verified: claims.filter((c) => c.tag === "verified").length,
    inference: claims.filter((c) => c.tag === "inference").length,
    unconfirmed: claims.filter((c) => c.tag === "unconfirmed").length,
  };
}
