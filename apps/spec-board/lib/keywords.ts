// Keyword fallback for vault FTS — pure, no node/SDK imports.

const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "want", "need", "needs",
  "build", "make", "like", "into", "they", "them", "their", "would", "could",
  "should", "about", "when", "where", "which", "will", "what", "then", "than",
  "there", "here", "some", "more", "most", "very", "just", "also", "able",
]);

// Meaningful words from a vision, OR-ed so long free-text still matches
// websearch_to_tsquery (which ANDs terms by default).
export function keywordQuery(text: string): string | null {
  const words = [...new Set(text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [])]
    .filter((w) => !STOPWORDS.has(w))
    .slice(0, 8);
  return words.length > 0 ? words.join(" or ") : null;
}
